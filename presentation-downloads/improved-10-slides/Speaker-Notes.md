# KeyCritter — improved 10-slide presentation

Based on Eric Han’s updated y (1).pdf. The notebook theme, original character guide and ten-page structure are retained. All text, cards, speech bubbles and comparison cells are separate editable objects; character artwork and screenshots are images. Approximately 6–8 minutes plus a live demo.

## Slide 1: KeyCritter

Hi everyone. My project is KeyCritter, a tiny typing companion. Users can choose a character, personalize the room, and see reactions while typing. It includes a website designer and a Windows desktop app. I will explain the idea, demonstrate the experience, and discuss what building it taught me.

## Slide 2: Problems while typing?

Typing can be repetitive, especially during long writing, study, or coding sessions. The goal was to make that everyday activity feel more personal and playful. KeyCritter adds a customizable character that reacts to what users already do. This is a design motivation, not a claim that productivity or wellbeing has been scientifically improved.

## Slide 3: Creative process

The process had four stages. Idea: define the companion experience and visual style. Design: plan the character library, room, and reaction controls. Build: connect the interface, artwork, typing events, saving, and desktop app. Improve: test behavior and use feedback to fix problems. The artwork on this slide shows the original guide acting out each stage.

## Slide 4: Demo time!

For the live demo, I will choose a character, change the background, and type in the playground. Then I will trigger a configured reaction and save the pet. Enter can be assigned to Drink for an easy example. To carry the website design into the Windows app, Save my pet for desktop creates a pet file, and Import website pet opens it in the app. The screenshot is a backup if the live demo is unavailable.

## Slide 5: Tools and technology

React and TypeScript support the interface and settings. Vite builds the website. Electron provides the Windows desktop app. GitHub tracks code, and GitHub Actions builds, tests, and publishes releases. Playwright checks browser interactions and layout. Codex assisted development and artwork work; AI output still needed direction, review, testing, and refinement. These tools have different roles, so I have labeled them rather than showing unexplained logos.

## Slide 6: Comparing virtual companions

This compares KeyCritter with classic Microsoft Office assistants and the built-in Codex pet selector shown in the supplied screenshot. Clippy was part of a desktop app and Office could offer alternative assistants. The Codex selector explicitly offers pet uploads and creation with ChatGPT. I have omitted claims about Codex background selection or custom key bindings because those features were not verified. KeyCritter’s own focus is configurable typing reactions and illustrated rooms.

## Slide 7: Challenges faced

Artwork consistency was a challenge because characters needed to remain recognizable across poses. References and visual review helped. Library size required organizing images into small batches loaded on demand. Saved settings also needed careful handling: older pets lacked new poses, and browser storage is separate from the desktop app. Migration updates and a clear export/import handoff helped preserve user work. This slide focuses on concrete problems encountered in the project.

## Slide 8: “Key” takeaways

The first lesson is to listen to feedback and turn it into specific improvements. The second is to test the details and identify the real cause of a problem rather than guessing. The third is to preserve existing user work. A feature may work for a new pet but fail with an older saved design. The project also reinforced that AI-assisted output needs checking and refinement.

## Slide 9: Skills developed

This project gave me practice with planning a web interface, organizing character data and images, testing interactions, and investigating bugs. It also involved managing changes through GitHub and directing AI-assisted development. I should describe my own role accurately: choosing requirements, reviewing output, prioritizing changes, and checking results are distinct from writing every line manually. Next, I would test the experience with more users and improve first-use guidance.

## Slide 10: Thank you!

Thank you for listening. KeyCritter started with the idea of making an everyday typing session feel a little more personal. Building it involved design, artwork, data organization, testing, and changes based on feedback. You can try the website using the link or QR code. I am happy to demonstrate the project or answer questions.

## Demo checklist

Choose a character, set a background, assign Enter to Drink, type and trigger the pose, then save. For web-to-desktop transfer, Save my pet for desktop creates a .keycritter.json file; Import website pet opens it in the desktop app. There is no automatic cloud sync.

## Reference and accuracy

Visual reference: user-supplied y (1).pdf. Comparison: classic Office assistants and the user-supplied built-in Codex pet selector. Unverified competing features are omitted. Ten poses means pose previews, not ten fully animated sequences. Productivity or wellbeing benefits have not been measured. Describe personal contributions honestly.
