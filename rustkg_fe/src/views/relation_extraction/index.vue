<template>
  <div>
    <label class="extract__label">URL</label
    ><textarea name="url" v-model="url" class="extract__input"></textarea><br />
    <label class="extract__label">Save File Directory</label
    ><input type="text" v-model="fileDirectory" /><br />
    <label class="extract__label">Model</label
    ><input type="text" v-model="model" /><br />
    <button @click="startCrawler">Start</button>
    <button @click="forceFlag = !forceFlag">
      {{ "Force: " + forceFlag.toString() }}
    </button>
    <button @click="visitMoreFlag = !visitMoreFlag">
      {{ "Visit More: " + visitMoreFlag.toString() }}
    </button>
    <button @click="resume">Resume from history</button>
  </div>
</template>

<script setup lang="ts">
import http from "@/services/http";
import { ref } from "vue";
import TaskManager from "@/utils/TaskManager";

const url = ref("");
const fileDirectory = ref("");
const model = ref("");
const visitMoreFlag = ref(true);
const forceFlag = ref(false);
const taskManager = new TaskManager();

const visitMore = async (url: string) => {
  if (!visitMoreFlag.value) {
    return;
  }
  const response = await http.post("/relation_extraction", {
    url,
    savePath: fileDirectory.value,
    force: forceFlag.value,
    model: model.value.length > 0 ? model.value : undefined,
  });
  console.log(response.data);
  taskManager.mapTasks(response.data.links, visitMore);
};

const startCrawler = async () => {
  const response = await http.post("/relation_extraction", {
    url: url.value,
    savePath: fileDirectory.value,
    force: forceFlag.value,
    model: model.value.length > 0 ? model.value : undefined,
  });
  console.log(response.data);
  taskManager.mapTasks(response.data.links, visitMore);
};

const resume = async () => {
  const response = await http.get("/gather_history");
  console.log(response.data);
  taskManager.mapTasks(response.data, visitMore);
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
