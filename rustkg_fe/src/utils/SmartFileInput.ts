import type { Ref } from "vue";

export function SmartFileInput(
  fileInput: Ref<HTMLInputElement | undefined>,
  callback: (file: File) => void
) {
  let lastFile: File | null = null;
  const clickHandler = () => {
    fileInput.value!.click();
    fileInput.value!.value = "";
  };
  const changeHandler = () => {
    const files = fileInput.value!.files;
    if (files && files.length > 0) {
      lastFile = files[0];
      callback(files[0]);
    } else if (lastFile) {
      callback(lastFile);
    }
  };
  return {
    clickHandler,
    changeHandler,
  };
}
