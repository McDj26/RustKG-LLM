<template>
  <div>
    <label class="extract__label">URL</label
    ><textarea name="url" v-model="url" class="extract__input"></textarea><br />
    <label class="extract__label">FOLLOWS</label
    ><textarea
      name="follows"
      v-model="follows"
      class="extract__input"
    ></textarea
    ><br />
    <label class="extract__label">Save File Directory</label
    ><input type="text" v-model="fileDirectory" /><br />
    <label class="extract__label">Extract Rule</label
    ><input
      v-show="false"
      ref="fileInput"
      type="file"
      accept=".json"
      @change="changeHandler"
    /><button @click="clickHandler">Load File</button><span>{{ fileName }}</span
    ><br />
    <button @click="startCrawler">Start</button>
    <span v-show="timeCost >= 0">总耗时：{{ timeCost }}ms</span>
  </div>
</template>

<script setup lang="ts">
import http from "@/services/http";
import { ref } from "vue";
import { SmartFileInput } from "../../utils/SmartFileInput";

const url = ref("");
const follows = ref("");
const fileDirectory = ref("");

const fileInput = ref<HTMLInputElement>();
const fileName = ref("未选择文件");
const extractRule = ref({});
const timeCost = ref(-1);

const { clickHandler, changeHandler } = SmartFileInput(fileInput, (file) => {
  fileName.value = file.name;

  const reader = new FileReader();
  reader.onloadend = () => {
    extractRule.value = JSON.parse(reader.result as string);
  };
  reader.readAsText(file);
});

const startCrawler = async () => {
  timeCost.value = -1;

  const response = await http.post("/extract", {
    url: url.value,
    follows: follows.value,
    extractRule: extractRule.value,
    path: fileDirectory.value,
  });
  timeCost.value = response.data.timeCost;
};
</script>

<style scoped>
.extract__label {
  position: absolute;
  transform: translateX(-100%);
}
.extract__input {
  width: 500px;
  height: 50px;
  resize: none;
}
</style>
