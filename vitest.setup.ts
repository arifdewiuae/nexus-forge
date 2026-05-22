/**
 * Vitest global setup — exposes Vue reactivity APIs as globals so that
 * Pinia setup-stores using Nuxt auto-imports work in the test environment.
 */
import {
  ref, computed, watch, watchEffect, reactive, readonly, toRef, toRefs,
  shallowRef, shallowReactive, shallowReadonly, triggerRef, markRaw,
  isRef, isReactive, isReadonly, unref, toRaw,
  onMounted, onUnmounted, onBeforeUnmount, onUpdated,
  nextTick, defineComponent, createApp,
} from 'vue'

/* eslint-disable @typescript-eslint/no-explicit-any */
const g = globalThis as any
g.ref            = ref
g.computed       = computed
g.watch          = watch
g.watchEffect    = watchEffect
g.reactive       = reactive
g.readonly       = readonly
g.toRef          = toRef
g.toRefs         = toRefs
g.shallowRef     = shallowRef
g.shallowReactive = shallowReactive
g.shallowReadonly = shallowReadonly
g.triggerRef     = triggerRef
g.markRaw        = markRaw
g.isRef          = isRef
g.isReactive     = isReactive
g.isReadonly     = isReadonly
g.unref          = unref
g.toRaw          = toRaw
g.onMounted      = onMounted
g.onUnmounted    = onUnmounted
g.onBeforeUnmount = onBeforeUnmount
g.onUpdated      = onUpdated
g.nextTick       = nextTick
g.defineComponent = defineComponent
g.createApp      = createApp
