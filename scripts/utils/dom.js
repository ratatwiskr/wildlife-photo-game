// src/utils/dom.ts
/** Toggle the fullscreen scene picker and the viewport visibility together. */
function setScenePickerVisible(visible) {
    const scenePicker = document.getElementById("scenePicker");
    const vp = document.getElementById("viewport");
    if (scenePicker)
        scenePicker.style.display = visible ? "block" : "none";
    if (vp)
        vp.style.display = visible ? "none" : "inline-block";
}
/** Hide the scene picker and restore the viewport. */
export function hidePicker() {
    setScenePickerVisible(false);
}
/** Show the scene picker and hide the viewport. */
export function showPicker() {
    setScenePickerVisible(true);
}
