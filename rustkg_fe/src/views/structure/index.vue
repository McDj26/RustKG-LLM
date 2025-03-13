<template>
  <div>
    <label class="analysis__label">URL</label
    ><textarea name="url" v-model="url" class="analysis__input"></textarea
    ><br />
    <label class="analysis__label">FOLLOWS</label
    ><textarea
      name="follows"
      v-model="follows"
      class="analysis__input"
    ></textarea
    ><br />
    <button @click="startCrawler">Fetch</button>
    <br />
    <input
      ref="fileLoader"
      type="file"
      accept=".json"
      @change="loadStructure"
    />
    <button @click="saveStructure">Save Structure</button>
    <StructureChart :doc-structure="structure"></StructureChart>
  </div>
</template>

<script setup lang="ts">
import http from "@/services/http";
import { ref } from "vue";
import StructureChart from "./StructureChart.vue";
import downloadObjJSON from "@/utils/downloadObjJSON";

const url = ref("");
const follows = ref("");

const structure = ref({});

const startCrawler = async () => {
  const response = await http.get(
    `/structure?url=${url.value}&follows=${follows.value}`
  );
  structure.value = response.data;
};

const saveStructure = () => {
  downloadObjJSON(structure.value, "structure.json");
};

const fileLoader = ref<HTMLInputElement>();
const loadStructure = () => {
  const file = fileLoader.value?.files?.[0];
  if (file) {
    const reader = new FileReader();
    reader.onloadend = () => {
      structure.value = JSON.parse(reader.result as string);
    };
    reader.readAsText(file);
  }
};
</script>

<style scoped>
.analysis__label {
  position: absolute;
  transform: translateX(-100%);
}
.analysis__input {
  width: 500px;
  height: 50px;
  resize: none;
}
</style>
