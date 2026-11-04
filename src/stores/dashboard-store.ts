import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { persist } from "zustand/middleware";
import { nanoid } from "nanoid";
import type {
  DashboardConfig,
  WidgetConfig,
  WidgetLayout,
  GridLayout,
  WidgetType,
} from "@/types/dashboard";

import type { TransactionCategory } from "@/lib/analytics/category-engine";

interface DashboardState {
  config: DashboardConfig | null;
  activeWidgetId: string | null;
  history: DashboardConfig[];
  historyIndex: number;

  // Analytical Controls
  excludeTransfers: boolean;
  categoryOverrides: Record<string, TransactionCategory>;

  toggleExcludeTransfers: () => void;
  setCategoryOverride: (
    targetKey: string,
    category: TransactionCategory,
  ) => void;
  clearCategoryOverrides: () => void;

  setConfig: (config: DashboardConfig) => void;
  addWidget: (type: WidgetType, partial?: Partial<WidgetConfig>) => string;
  updateWidget: (id: string, patch: Partial<WidgetConfig>) => void;
  removeWidget: (id: string) => void;
  duplicateWidget: (id: string) => void;
  updateLayout: (layouts: GridLayout[]) => void;
  setActiveWidget: (id: string | null) => void;
  undo: () => void;
  redo: () => void;
  reset: () => void;
}

const MAX_HISTORY = 20;

function deepClone<T>(obj: T): T {
  try {
    return structuredClone(obj);
  } catch {
    return JSON.parse(JSON.stringify(obj)) as T;
  }
}

function pushHistory(state: DashboardState, config: DashboardConfig) {
  state.history = state.history.slice(0, state.historyIndex + 1);
  state.history.push(deepClone(config));
  if (state.history.length > MAX_HISTORY) {
    state.history.shift();
  }
  state.historyIndex = state.history.length - 1;
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    immer((set, get) => ({
      config: null,
      activeWidgetId: null,
      history: [],
      historyIndex: -1,

      excludeTransfers: false,
      categoryOverrides: {},

      toggleExcludeTransfers: () =>
        set((state) => {
          state.excludeTransfers = !state.excludeTransfers;
        }),

      setCategoryOverride: (targetKey, category) =>
        set((state) => {
          state.categoryOverrides[targetKey] = category;
        }),

      clearCategoryOverrides: () =>
        set((state) => {
          state.categoryOverrides = {};
        }),

      setConfig: (config) =>
        set((state) => {
          state.config = config;
          state.history = [deepClone(config)];
          state.historyIndex = 0;
        }),

      addWidget: (type, partial = {}) => {
        const id = nanoid();
        const widget: WidgetConfig = {
          id,
          type,
          title: `New ${type} chart`,
          layout: { x: 0, y: 0, w: 4, h: 3 },
          data: { mappings: { values: [] } },
          visualization:
            type === "kpi" ? {} : type === "bar" ? { variant: "grouped" } : {},
          ...partial,
        } as WidgetConfig;

        set((state) => {
          if (!state.config) return;
          state.config.widgets.push(widget);
          pushHistory(state, state.config);
        });

        return id;
      },

      updateWidget: (id, patch) =>
        set((state) => {
          if (!state.config) return;
          const idx = state.config.widgets.findIndex((w) => w.id === id);
          if (idx === -1) return;
          state.config.widgets[idx] = {
            ...state.config.widgets[idx],
            ...patch,
          };
          pushHistory(state, state.config);
        }),

      removeWidget: (id) =>
        set((state) => {
          if (!state.config) return;
          state.config.widgets = state.config.widgets.filter(
            (w) => w.id !== id,
          );
          if (state.activeWidgetId === id) {
            state.activeWidgetId = null;
          }
          pushHistory(state, state.config);
        }),

      duplicateWidget: (id) =>
        set((state) => {
          if (!state.config) return;
          const source = state.config.widgets.find((w) => w.id === id);
          if (!source) return;
          const clone = structuredClone(source);
          clone.id = nanoid();
          clone.title = `${source.title} (copy)`;
          clone.layout = {
            ...clone.layout,
            x: Math.min(clone.layout.x + 1, 10),
            y: clone.layout.y + clone.layout.h + 1,
          };
          state.config.widgets.push(clone);
          state.activeWidgetId = clone.id;
          pushHistory(state, state.config);
        }),

      updateLayout: (layouts) =>
        set((state) => {
          if (!state.config) return;
          for (const layout of layouts) {
            const widget = state.config.widgets.find((w) => w.id === layout.i);
            if (widget) {
              widget.layout = {
                x: layout.x,
                y: layout.y,
                w: layout.w,
                h: layout.h,
              };
            }
          }
        }),

      setActiveWidget: (id) =>
        set((state) => {
          state.activeWidgetId = id;
        }),

      undo: () =>
        set((state) => {
          if (state.historyIndex <= 0) return;
          state.historyIndex--;
          state.config = deepClone(state.history[state.historyIndex]);
        }),

      redo: () =>
        set((state) => {
          if (state.historyIndex >= state.history.length - 1) return;
          state.historyIndex++;
          state.config = deepClone(state.history[state.historyIndex]);
        }),

      reset: () =>
        set((state) => {
          state.config = null;
          state.excludeTransfers = false;
          state.categoryOverrides = {};
          state.activeWidgetId = null;
          state.history = [];
          state.historyIndex = -1;
        }),
    })),
    {
      name: "dashboard-storage",
      partialize: (state) => ({
        config: state.config,
        excludeTransfers: state.excludeTransfers,
        categoryOverrides: state.categoryOverrides,
      }),
    },
  ),
);

export const selectWidgets = (state: DashboardState): WidgetConfig[] =>
  state.config?.widgets ?? [];

export const selectActiveWidget = (
  state: DashboardState,
): WidgetConfig | null =>
  state.config?.widgets.find((w) => w.id === state.activeWidgetId) ?? null;
