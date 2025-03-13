<template>
  <label>File Path<input type="text" v-model="filePath" /></label>
  <button @click="handleClick">Load</button>
  <div class="view-chart">
    <v-chart :option="option" autoresize></v-chart>
  </div>
</template>

<script setup lang="ts">
import { use } from "echarts/core";
import VChart from "vue-echarts";
import { computed, ref } from "vue";
import { GraphChart } from "echarts/charts";
import { CanvasRenderer } from "echarts/renderers";
import { TooltipComponent } from "echarts/components";
import http from "@/services/http";
import { splitStr, cutStr } from "@/utils/splitStr";

use([GraphChart, CanvasRenderer, TooltipComponent]);

const filePath = ref("");
const data = ref<
  {
    id: string;
    name: string;
  }[]
>([]);
const links = ref<
  {
    source: string;
    target: string;
    relation: string;
  }[]
>([]);

const handleClick = async () => {
  const response = await http.get(`/chart_data?fileName=${filePath.value}`);
  data.value = response.data.data;
  links.value = response.data.links;
};

const processed_data = computed(() => {
  return data.value.map((node) => ({
    name: node.name,
    id: node.id,
    label: {
      show: node.name.length < 20,
      formatter: splitStr(node.name, 30, "\n"),
    },
    tooltip: {
      formatter: splitStr(node.name, 40, "<br />"),
    },
    emphasis: {
      label: {
        show: true,
      },
    },
  }));
});

const processed_links = computed(() => {
  return links.value.map((link) => {
    return {
      source: link.source,
      target: link.target,
      label: {
        show: link.relation.length < 30,
        formatter: splitStr(link.relation, 15, "\n"),
        verticalAlign: "middle",
      },
      tooltip: {
        formatter: `${splitStr(link.source, 40, "<br />")}<br />${splitStr(
          link.relation,
          40,
          "<br />"
        )}<br />${splitStr(link.target, 40, "<br />")}`,
      },
      emphasis: {
        label: {
          show: true,
        },
      },
      value: 20,
    };
  });
});

const option = computed(() => ({
  tooltip: {
    trigger: "item",
    triggerOn: "mousemove",
  },
  series: [
    {
      type: "graph",
      layout: "force",
      data: processed_data.value,
      links: processed_links.value,
      emphasis: {
        focus: "adjacency",
      },
      force: {
        repulsion: 500,
      },
      draggable: true,
    },
  ],
}));
</script>

<style scoped>
.view-chart {
  width: 1000px;
  height: 500px;
}
</style>
