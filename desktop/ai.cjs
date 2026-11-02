const { validImages } = require('./shared.cjs');
const MODELS = ['gpt-image-1.5', 'gpt-image-2.5-flare', 'gpt-image-2.5-sunburst'];
const POSES = ['idle', 'jump', 'cheer', 'surprise', 'dance', 'sleep'];
const POSE_PROMPTS = {
  idle: 'Standing in a relaxed, friendly idle pose, looking toward the viewer.',
  jump: 'An excited jumping pose, feet tucked slightly up, playful expression.',
  cheer: 'Cheering happily with arms or paws raised and a big smile.',
  surprise: 'A surprised expression with wide eyes and a small open mouth.',
  dance: 'A joyful dancing pose, tilted slightly with a playful expression.',
  sleep: 'Sleeping peacefully, curled up or sitting with closed eyes.',
};

function validRequest(value) {
  return (
    value &&
    typeof value.prompt === 'string' &&
    value.prompt.trim().length >= 3 &&
    value.prompt.length <= 1500 &&
    MODELS.includes(value.model) &&
    POSES.includes(value.pose) &&
    (value.reference === undefined || validImages({ idle: value.reference }))
  );
}
function providerError(status) {
  if (status === 401) return 'OpenAI did not accept this API key. Check your connection settings.';
  if (status === 403)
    return 'Your OpenAI project does not have access to this image model. Check project access and any required verification.';
  if (status === 429)
    return 'OpenAI has limited this request. Check your API credits, billing, or rate limit, then try again.';
  if (status === 400)
    return 'OpenAI could not generate this image. Try adjusting the prompt or choosing another supported model.';
  if (status === 404)
    return 'This model is unavailable for your OpenAI project. Choose another model.';
  return 'OpenAI could not complete the request. Please try again later.';
}

async function generateImage({ request, key, fetchImpl, signal }) {
  if (!validRequest(request))
    throw new Error('Enter a prompt of 3–1500 characters and choose a supported pose and model.');
  if (typeof key !== 'string' || !key) throw new Error('Connect your OpenAI API key first.');
  const pose =
    request.reference && request.pose === 'idle'
      ? 'Preserve the reference body pose, silhouette, scale, camera, and placement. Change only the expression details requested by the user, keeping the rest aligned for an animation.'
      : POSE_PROMPTS[request.pose];
  const prompt = `Create one character image for a desktop typing pet. User character description: ${request.prompt.trim()}\nPose: ${pose}\nShow a single complete character, centered, with a genuinely transparent background and generous clear space around it. No scene, text, labels, UI, shadow backdrop, or other characters. Keep all body parts inside the canvas.${request.reference ? '\nUse the reference image to preserve this exact character, colors, species, and accessories; change the pose and expression as requested.' : ''}`;
  const params = {
    model: request.model,
    prompt,
    n: 1,
    size: '1024x1024',
    quality: 'medium',
    background: 'transparent',
    output_format: 'png',
  };
  let body,
    headers = { Authorization: `Bearer ${key}` };
  if (request.reference) {
    body = new FormData();
    for (const [k, v] of Object.entries(params)) body.append(k, String(v));
    const [type, base64] = request.reference.split(';base64,');
    body.append(
      'image',
      new Blob([Buffer.from(base64, 'base64')], { type: type.slice(5) }),
      `reference.${type.includes('webp') ? 'webp' : type.includes('jpeg') ? 'jpg' : 'png'}`,
    );
  } else {
    body = JSON.stringify(params);
    headers['Content-Type'] = 'application/json';
  }
  let response;
  try {
    response = await fetchImpl(
      `https://api.openai.com/v1/images/${request.reference ? 'edits' : 'generations'}`,
      { method: 'POST', headers, body, signal, redirect: 'error' },
    );
  } catch {
    if (signal?.aborted) throw new Error('Generation cancelled or timed out.');
    throw new Error('Could not reach OpenAI. Check your Internet connection and try again.');
  }
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(providerError(response.status));
  }
  const reader = response.body.getReader();
  const parts = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > 24 * 1024 * 1024) {
      await reader.cancel();
      throw new Error('OpenAI returned an image too large to use. Please try again.');
    }
    parts.push(Buffer.from(value));
  }
  let result;
  try {
    result = JSON.parse(Buffer.concat(parts).toString('utf8'));
  } catch {
    throw new Error('OpenAI returned an unreadable response. Please try again.');
  }
  const data = result?.data?.[0]?.b64_json;
  if (
    typeof data !== 'string' ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(data) ||
    !Buffer.from(data, 'base64')
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    throw new Error('OpenAI did not return a usable PNG image. Please try again.');
  return `data:image/png;base64,${data}`;
}
module.exports = { MODELS, validRequest, providerError, generateImage };
