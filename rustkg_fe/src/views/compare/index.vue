<template>
  <div>
    <label class="compare__label">require structure</label
    ><input
      type="file"
      ref="requireInput"
      v-show="false"
      @change="requireChangeHandler"
    /><button @click="requireClickHandler">Load File</button
    ><span>{{ requireFileName }}</span
    ><br />
    <label class="compare__label">current structure</label
    ><input
      type="file"
      ref="currentInput"
      v-show="false"
      @change="currentChangeHandler"
    /><button @click="currentClickHandler">Load File</button
    ><span>{{ currentFileName }}</span
    ><br />
    <button @click="startComparison">Start Comparison</button
    ><button @click="downloadDiff">Save Diff</button>
  </div>
</template>

<script setup lang="ts">
import http from "@/services/http";
import downloadObjJSON from "@/utils/downloadObjJSON";
import { SmartFileInput } from "@/utils/SmartFileInput";
import { ref } from "vue";

const requireInput = ref<HTMLInputElement>();
const currentInput = ref<HTMLInputElement>();

const requireFileName = ref("未选择文件");
const currentFileName = ref("未选择文件");

const requireStructure = ref({});
const currentStructure = ref({});
const diffStructure = ref({});

const {
  clickHandler: requireClickHandler,
  changeHandler: requireChangeHandler,
} = SmartFileInput(requireInput, (file) => {
  requireFileName.value = file.name;

  const reader = new FileReader();
  reader.onloadend = () => {
    requireStructure.value = JSON.parse(reader.result as string);
  };
  reader.readAsText(file);
});
const {
  clickHandler: currentClickHandler,
  changeHandler: currentChangeHandler,
} = SmartFileInput(currentInput, (file) => {
  currentFileName.value = file.name;

  const reader = new FileReader();
  reader.onloadend = () => {
    currentStructure.value = JSON.parse(reader.result as string);
  };
  reader.readAsText(file);
});
const startComparison = async () => {
  const response = await http.post("/compare", {
    require: requireStructure.value,
    current: currentStructure.value,
  });
  const {
    data: { diff },
  } = response;
  diffStructure.value = diff;
  console.log(diff);
};
const downloadDiff = () => {
  downloadObjJSON(diffStructure.value, "diff.json");
};
</script>

<style scoped>
.compare__label {
  position: absolute;
  transform: translateX(-100%);
}
</style>
