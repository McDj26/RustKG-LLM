<template>
  <div class="structure-chart">
    <v-chart :option="option" autoresize @click="handleClick"></v-chart>
  </div>
</template>

<script setup lang="ts">
import { use } from "echarts/core";
import VChart from "vue-echarts";
import { computed } from "vue";
import { TreeChart } from "echarts/charts";
import { CanvasRenderer } from "echarts/renderers";
import { TooltipComponent } from "echarts/components";

use([TreeChart, CanvasRenderer, TooltipComponent]);

const props = defineProps<{
  docStructure: Object;
}>();

const handleClick = (e: any) => {
  console.log(e);
};

function toArray(obj: {
  [key: string]: any;
}): { name: string; children?: any }[] {
  return Object.keys(obj).map((key) => ({
    name: key.replace(/(\#|\.)(.*)/g, ""),
    children: obj[key] instanceof Object ? toArray(obj[key]) : undefined,
    tooltip: {
      formatter: () =>
        key
          .replace(/^[^\#\.]*/g, "")
          .trim()
          .split(/\.|\s/)
          .filter(Boolean)
          .map((str) => (str.startsWith("#") ? str : `.${str}`))
          .join("<br/>"),
    },
  }));
}

const option = computed(() => ({
  tooltip: {
    trigger: "item",
    triggerOn: "mousemove",
  },
  series: [
    {
      type: "tree",
      data: toArray(props.docStructure),
      emphasis: {
        focus: "descendant",
      },
      label: {
        position: "left",
      },
      leaves: {
        label: {
          position: "right",
        },
      },
    },
  ],
}));
</script>

<style scoped>
.structure-chart {
  width: 500px;
  height: 500px;
}
</style>
