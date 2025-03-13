<script setup lang="ts">
import type { RouterLink } from "vue-router";
</script>

<template>
  <main>
    <ul class="menu">
      <li>
        <RouterLink
          :to="{
            name: 'structure',
          }"
        >
          Structure
        </RouterLink>
      </li>
      <li>
        <RouterLink
          :to="{
            name: 'extract',
          }"
          >Extract</RouterLink
        >
      </li>
      <li>
        <RouterLink
          :to="{
            name: 'compare',
          }"
          >Compare</RouterLink
        >
      </li>
      <li>
        <RouterLink
          :to="{
            name: 'relation_extraction',
          }"
          >Relation Extraction</RouterLink
        >
      </li>
      <li>
        <RouterLink :to="{ name: 'chart' }">View Chart</RouterLink>
      </li>
    </ul>
  </main>
</template>

<style lang="scss">
.menu {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>
