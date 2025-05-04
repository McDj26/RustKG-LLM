<template>
  <div class="control-panel">
    <label>File Path<input type="text" v-model="filePath" /></label>
    <button @click="handleLoadFile">Load File</button>
    <button @click="handleLoadMerged">Load merged data</button>
    <button @click="delayAdd(100)">Add Next</button>
  </div>
  <!-- 新增关系黑名单相关控件 -->
  <div class="control-panel">
    <label
      >关系黑名单：
      <input
        type="text"
        :value="Array.from(relationBlacklist).join(', ')"
        readonly
      />
    </label>
    <select v-model="selectedRelation">
      <option value="">请选择关系</option>
      <option v-for="rel in currentRelations" :key="rel" :value="rel">
        {{ cutStr(rel, 30) }}
      </option>
    </select>
    <button @click="addToBlacklist">添加</button>
  </div>
  <div class="view-chart">
    <v-chart :option="option" autoresize @dblclick="handleDbClick"></v-chart>
  </div>
</template>

<script setup lang="ts">
import { use, type ECElementEvent } from "echarts/core";
import VChart from "vue-echarts";
import { computed, ref, watch } from "vue";
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

const handleLoadFile = async () => {
  const response = await http.get(`/chart_data?fileName=${filePath.value}`);
  data.value = response.data.data;
  links.value = response.data.links;
};

const handleLoadMerged = async () => {
  const response = await http.get(
    `/merged_chart_data?apiName=${filePath.value}`
  );
  data.value = response.data.data;
  links.value = response.data.links;
  rootNode.value = filePath.value;
};

const handleDbClick = (param: ECElementEvent) => {
  const data = param.data;
  blackList.value.add(data.id);
  delayAdd(0);
};

// 新增关系黑名单相关状态
const relationBlacklist = ref<Set<string>>(new Set());
const selectedRelation = ref("");

// 获取当前显示的关系列表
const currentRelations = computed(() => {
  const relations = new Set<string>();
  processedLinks.value.forEach((link) => {
    if (!relationBlacklist.value.has(link.relation))
      relations.add(link.relation);
  });
  return Array.from(relations).sort();
});

// 添加到黑名单方法
const addToBlacklist = () => {
  if (selectedRelation.value) {
    relationBlacklist.value.add(selectedRelation.value);
    selectedRelation.value = "";
    delayAdd(0); // 触发更新
  }
};

const processedData = computed(() => {
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

const processedLinks = computed(() => {
  return links.value.map((link) => {
    return {
      source: link.source,
      target: link.target,
      relation: link.relation,
      // label: {
      //   show: link.relation.length < 30,
      //   formatter: splitStr(link.relation, 15, "\n"),
      //   verticalAlign: "middle",
      // },
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

const rootNode = ref("");
const searchDepth = ref(3);
const blackList = ref<Set<string>>(new Set());

let refreshed = false;

const delayDisplayData = ref<{
  data: typeof processedData.value;
  links: typeof processedLinks.value;
}>({ data: [], links: [] });

let delayIndex = 0;

function delayAdd(add: number) {
  if (!refreshed) {
    delayDisplayData.value = { data: [], links: [] };
    refreshed = true;
  }
  if (delayIndex >= processedData.value.length) return;
  delayIndex += add;
  if (delayIndex >= processedData.value.length) {
    delayIndex = processedData.value.length;
  }
  const nodes = processedData.value
    .slice(0, delayIndex)
    .filter((node) => !blackList.value.has(node.id));
  const nodesSet = new Set(nodes.map((n) => n.id));
  const usedNodesSet = new Set();
  const filteredLinks = processedLinks.value.filter(
    (link) =>
      nodesSet.has(link.source) &&
      nodesSet.has(link.target) &&
      !relationBlacklist.value.has(link.relation)
  );
  filteredLinks.forEach((link) => {
    usedNodesSet.add(link.source);
    usedNodesSet.add(link.target);
  });
  delayDisplayData.value = {
    data: nodes.filter((node) => usedNodesSet.has(node.id)),
    links: filteredLinks,
  };
}

watch(processedData, () => {
  blackList.value = new Set();
  relationBlacklist.value = new Set(); // 新增清空关系黑名单
  delayAdd(100);
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
      data: delayDisplayData.value.data,
      links: delayDisplayData.value.links,
      emphasis: {
        focus: "adjacency",
      },
      force: {
        repulsion: 500,
        friction: 0.1,
      },
      roam: true,
      draggable: true,
    },
  ],
}));
</script>

<style scoped>
/* 新增黑名单控件样式 */
.control-panel {
  margin: 10px 0;
  padding: 10px;
  border: 1px solid #eee;
}

.blacklist-control input[type="text"] {
  width: 300px;
  margin-right: 10px;
}

.blacklist-control select {
  width: 200px;
  margin-right: 10px;
}
.view-chart {
  width: 1000px;
  height: 1000px;
}
</style>
