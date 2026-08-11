# Records docs/preset.gif, the README's demonstration of `npm run preset`.
# Re-record from the repository root after any change to the questionnaire:
#
#   vhs docs/preset.tape
#
# Needs vhs (brew install vhs). The run writes presets/soft.json, so the tape
# removes it again off camera at the end.

Output docs/preset.gif

Set Shell zsh
Set FontSize 15
Set Width 1000
Set Height 780
Set Padding 20
Set TypingSpeed 55ms

Hide
Type "clear"
Enter
Show

Sleep 500ms
Type "npm run --silent preset"
Sleep 400ms
Enter
Sleep 2500ms

Type "soft"
Sleep 400ms
Enter
Sleep 700ms

Type "medium"
Sleep 400ms
Enter
Sleep 700ms

# Enter alone keeps the default, which is what the hint line promises.
Sleep 600ms
Enter
Sleep 700ms

Type "sharp"
Sleep 400ms
Enter
Sleep 700ms

Type "nunito"
Sleep 400ms
Enter
Sleep 1200ms

Type "stone"
Sleep 500ms
Enter
Sleep 1500ms

Type "blue"
Sleep 500ms
Enter

Sleep 4000ms

Hide
Type "rm -f presets/soft.json"
Enter
