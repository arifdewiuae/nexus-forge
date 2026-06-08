<template>
  <div class="ai-tab-body ai-tab-body--input">
    <div class="ai-tab-scroll">
      <!-- Analyze current map -->
      <button
        class="ai-analyze-btn"
        :disabled="ai.isAnalyzing"
        @click="submitAnalyze"
      >
        {{ ai.isAnalyzing ? '⟳ thinking…' : (ai.analysisResult ? '↻ re-analyze map' : '✦ analyze my map') }}
      </button>
      <div class="ai-analyze-hint">AI reads your current board and suggests ideas</div>

      <div class="ai-divider"><span>or give it a brain dump</span></div>

      <!-- Brain dump -->
      <div class="ai-prompt-input-row">
        <textarea
          class="ai-prompt-textarea"
          v-model="ai.userPrompt"
          placeholder="type or speak… AI will build the map"
          rows="3"
          :disabled="ai.isAnalyzing"
          @keydown.meta.enter.prevent="submitWithPrompt"
          @keydown.ctrl.enter.prevent="submitWithPrompt"
        ></textarea>
        <button
          class="ai-mic-btn"
          :class="{ listening: isListening }"
          @click="toggleMic"
          :aria-label="isListening ? 'Stop voice input' : 'Start voice input'"
          :title="isListening ? 'stop recording' : 'speak your thoughts'"
        >
          {{ isListening ? '⏹' : '🎙' }}
        </button>
      </div>
      <div v-if="micError" class="ai-mic-error">{{ micError }}</div>
    </div>

    <div class="ai-input-footer">
      <button
        class="ai-submit-btn"
        :disabled="ai.isAnalyzing || !ai.userPrompt.trim()"
        @click="submitWithPrompt"
      >
        {{ ai.isAnalyzing ? '⟳ thinking…' : 'build map →' }}
      </button>
      <div class="ai-submit-hint">or ⌘↵</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onUnmounted } from 'vue'
import { useSpeechRecognition } from '~/composables/useSpeechRecognition'

const emit = defineEmits<{ analyze: [] }>()
const ai = useAIStore()

function submitAnalyze() {
  if (ai.isAnalyzing) return
  emit('analyze')
}

function submitWithPrompt() {
  if (ai.isAnalyzing || !ai.userPrompt.trim()) return
  emit('analyze')
}

/* ---- Speech recognition (composable) ---- */
const { isListening, error: micError, toggle: toggleMic, stop: stopMic } = useSpeechRecognition((text) => {
  ai.userPrompt = (ai.userPrompt ? ai.userPrompt + ' ' : '') + text
})

onUnmounted(() => stopMic())
</script>

<style scoped>
.ai-tab-body {
  padding: 10px 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 120px;
}

.ai-tab-body--input {
  min-height: 0;
}

.ai-tab-scroll {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ai-input-footer {
  flex-shrink: 0;
  padding-top: 4px;
}

.ai-analyze-btn {
  font-family: 'Caveat', cursive;
  font-size: 17px;
  background: transparent;
  border: 1.4px solid var(--accent);
  color: var(--accent);
  border-radius: 12px;
  padding: 6px 16px;
  cursor: pointer;
  width: 100%;
  transition: background 0.15s, color 0.15s, opacity 0.15s;
}

.ai-analyze-btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--accent) 10%, transparent);
}

.ai-analyze-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.ai-analyze-hint {
  font-family: 'Kalam', cursive;
  font-size: 11px;
  color: var(--muted);
  text-align: center;
  margin-top: -4px;
}

.ai-divider {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--muted);
  font-family: 'Kalam', cursive;
  font-size: 11px;
}

.ai-divider::before,
.ai-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: rgba(31,37,51,0.12);
}

.ai-prompt-label {
  font-family: 'Caveat', cursive;
  font-size: 14px;
  color: var(--muted);
}

.ai-prompt-input-row {
  display: flex;
  gap: 6px;
  align-items: flex-start;
}

.ai-prompt-textarea {
  flex: 1;
  font-family: 'Kalam', cursive;
  font-size: 13px;
  line-height: 1.4;
  color: var(--ink);
  background: rgba(255,255,255,0.6);
  border: 1.4px solid rgba(31,37,51,0.18);
  border-radius: 8px;
  padding: 6px 8px;
  resize: none;
  outline: none;
  transition: border-color 0.15s;
}

.ai-prompt-textarea:focus {
  border-color: var(--accent);
}

.ai-prompt-textarea::placeholder {
  color: var(--muted);
  opacity: 0.7;
}

.ai-mic-btn {
  font-size: 18px;
  background: rgba(255,255,255,0.7);
  border: 1.4px solid rgba(31,37,51,0.18);
  border-radius: 8px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: border-color 0.15s, background 0.15s;
}

.ai-mic-btn:hover {
  border-color: var(--accent);
}

.ai-mic-btn.listening {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 12%, white);
  animation: mic-pulse 1s ease-in-out infinite;
}

@keyframes mic-pulse {
  0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent) 30%, transparent); }
  50%       { box-shadow: 0 0 0 5px color-mix(in srgb, var(--accent) 0%, transparent); }
}

.ai-mic-error {
  font-family: 'Kalam', cursive;
  font-size: 11px;
  color: #c0392b;
}

.ai-submit-btn {
  font-family: 'Caveat', cursive;
  font-size: 17px;
  background: var(--accent);
  color: white;
  border: 1.4px solid var(--accent);
  border-radius: 12px;
  padding: 6px 16px;
  cursor: pointer;
  width: 100%;
  transition: opacity 0.15s, transform 0.1s;
}

.ai-submit-btn:hover:not(:disabled) {
  opacity: 0.88;
  transform: translateY(-1px);
}

.ai-submit-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.ai-submit-hint {
  font-family: 'Kalam', cursive;
  font-size: 11px;
  color: var(--muted);
  text-align: right;
  margin-top: -4px;
}

/* ---- Mobile: bottom sheet ---- */
@media (max-width: 800px) {
  .ai-tab-body {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .ai-tab-scroll {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
  .ai-input-footer {
    flex-shrink: 0;
    padding-top: 10px;
    border-top: 1px solid rgba(31,37,51,0.08);
    background: var(--paper-card);
  }
}
</style>
