import { createRouter, createWebHistory } from "vue-router";
import HomeView from "@/views/HomeView.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "home",
      component: HomeView,
    },
    {
      path: "/structure",
      name: "structure",
      component: () => import("../views/structure/index.vue"),
    },
    {
      path: "/extract",
      name: "extract",
      component: () => import("../views/extract/index.vue"),
    },
    {
      path: "/compare",
      name: "compare",
      component: () => import("../views/compare/index.vue"),
    },
    {
      path: "/relation_extraction",
      name: "relation_extraction",
      component: () => import("../views/relation_extraction/index.vue"),
    },
    {
      path: "/chart",
      name: "chart",
      component: () => import("../views/chart_view/index.vue"),
    },
  ],
});

export default router;
