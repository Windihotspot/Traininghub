<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { CategoriesService } from '@/services/traininghub'
import { useAsyncAction } from '@/composables/useAsyncAction'
import type { Category } from '@/types/traininghub'

const props = defineProps<{ organisationId: string }>()

const items = ref<Category[]>([])
const name = ref('')

const { loading, error, run } = useAsyncAction()

const load = () =>
  run(async () => {
    items.value = await CategoriesService.list(props.organisationId)
  })

const add = async () => {
  const categoryName = name.value.trim()

  if (!categoryName || loading.value) return

  const result = await run(async () => {
    await CategoriesService.create(
      props.organisationId,
      categoryName,
    )

    name.value = ''
    items.value = await CategoriesService.list(
      props.organisationId,
    )
  })

  return result
}

const showDeleteDialog = ref(false)
const selectedCategory = ref<Category | null>(null)
const deleting = ref(false)

const openDeleteDialog = (category: Category) => {
  if (!category.organisation_id || loading.value) return

  selectedCategory.value = category
  showDeleteDialog.value = true
}

const closeDeleteDialog = () => {
  if (deleting.value) return

  showDeleteDialog.value = false
  selectedCategory.value = null
}

const confirmDelete = async () => {
  const category = selectedCategory.value

  if (!category || deleting.value) return

  deleting.value = true

  try {
    await run(async () => {
      await CategoriesService.remove(category.id)

      items.value = items.value.filter(
        (item) => item.id !== category.id,
      )
    })

    // Close only after the delete operation succeeds
    showDeleteDialog.value = false
    selectedCategory.value = null
  } finally {
    deleting.value = false
  }
}
onMounted(load)
</script>

<template>
  <section class="category-manager">
    <!-- Header -->
    <header class="category-header">
      <div class="category-heading">
        <div class="category-heading-icon">
          <i class="fa-solid fa-layer-group"></i>
        </div>

        <div>
          <h3 class="category-title">
            Training categories
          </h3>

          <p class="category-subtitle">
            Organise your training programmes into meaningful groups.
          </p>
        </div>
      </div>

      <div
        v-if="!loading"
        class="category-count"
      >
        <span>{{ items.length }}</span>
        {{ items.length === 1 ? 'category' : 'categories' }}
      </div>
    </header>

    <!-- Add category -->
    <form
      class="category-form"
      @submit.prevent="add"
    >
      <div class="category-input-wrap">
        <label
          for="category-name"
          class="category-input-label"
        >
          Category name
        </label>

        <v-text-field
          id="category-name"
          v-model="name"
          placeholder="e.g. Leadership & Management"
          variant="outlined"
          density="comfortable"
          hide-details
          :disabled="loading"
          maxlength="100"
          class="category-input"
        >
          <template #prepend-inner>
            <i class="fa-solid fa-tag category-input-icon"></i>
          </template>
        </v-text-field>
      </div>

      <v-btn
        type="submit"
        class="category-add-btn"
        :loading="loading"
        :disabled="!name.trim() || loading"
        elevation="0"
      >
        <i class="fa-solid fa-plus mr-2"></i>
        Add category
      </v-btn>
    </form>

    <!-- Error -->
    <v-alert
      v-if="error"
      type="error"
      variant="tonal"
      density="comfortable"
      class="category-error"
    >
      <template #prepend>
        <i class="fa-solid fa-circle-exclamation"></i>
      </template>

      {{ error.message }}
    </v-alert>

    <!-- Loading -->
    <div
      v-if="loading && !items.length"
      class="category-loading"
      aria-label="Loading categories"
    >
      <div
        v-for="n in 4"
        :key="n"
        class="category-skeleton"
      ></div>
    </div>

    <!-- Categories -->
    <div
      v-else-if="items.length"
      class="category-content"
    >
      <div class="category-list-heading">
        <span>AVAILABLE CATEGORIES</span>

        <span class="category-list-hint">
          <i class="fa-solid fa-circle-info mr-1"></i>
          Global categories cannot be deleted here
        </span>
      </div>

      <div class="category-list">
        <div
          v-for="category in items"
          :key="category.id"
          class="category-item"
        >
          <div class="category-item-icon">
            <i class="fa-solid fa-folder-open"></i>
          </div>

          <div class="category-item-info">
            <span class="category-item-name">
              {{ category.name }}
            </span>

            <span
              v-if="!category.organisation_id"
              class="global-label"
            >
              <i class="fa-solid fa-globe"></i>
              Global category
            </span>

            <span
              v-else
              class="custom-label"
            >
              Organisation category
            </span>
          </div>

          <v-tooltip
            v-if="category.organisation_id"
            text="Delete category"
            location="top"
          >
            <template #activator="{ props: tooltipProps }">
              <button
                v-bind="tooltipProps"
                type="button"
                class="category-delete-btn"
                :disabled="loading"
                :aria-label="`Delete ${category.name}`"
                @click="openDeleteDialog(category)"
              >
                <i class="fa-regular fa-trash-can"></i>
              </button>
            </template>
          </v-tooltip>

          <div
            v-else
            class="global-lock"
            title="Global categories cannot be deleted here"
          >
            <i class="fa-solid fa-lock"></i>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-else
      class="category-empty"
    >
      <div class="category-empty-icon">
        <i class="fa-solid fa-folder-plus"></i>
      </div>

      <h4>No categories yet</h4>

      <p>
        Create your first category to keep your training programmes
        organised and easy to discover.
      </p>
    </div>

    <!-- Footer -->
    <footer class="category-footer">
      <i class="fa-solid fa-shield-halved"></i>

      <span>
        Categories help keep your organisation's training library organised.
      </span>
    </footer>
  </section>
<!-- Custom delete confirmation -->
<v-dialog
  v-model="showDeleteDialog"
  max-width="440"
  persistent
>
  <div class="delete-dialog">
    <div class="delete-dialog-icon">
      <i class="fa-solid fa-trash-can"></i>
    </div>

    <h3 class="delete-dialog-title">
      Delete category?
    </h3>

    <p class="delete-dialog-description">
      Are you sure you want to delete
      <strong>{{ selectedCategory?.name }}</strong>?
      This action cannot be undone.
    </p>

    <div class="delete-dialog-notice">
      <i class="fa-solid fa-circle-info"></i>
      <span>
        Make sure this category is no longer needed before proceeding.
      </span>
    </div>

    <div class="delete-dialog-actions">
      <v-btn
        variant="outlined"
        class="delete-cancel-btn"
        :disabled="deleting"
        @click="closeDeleteDialog"
      >
        Cancel
      </v-btn>

      <v-btn
        class="delete-confirm-btn"
        :loading="deleting"
        :disabled="deleting"
        @click="confirmDelete"
      >
        <i class="fa-solid fa-trash-can mr-2"></i>
        Delete category
      </v-btn>
    </div>
  </div>
</v-dialog>
</template>

<style scoped>
.delete-dialog {
  padding: 28px;
  border: 1px solid #f0e9e9;
  border-radius: 22px;
  background: #ffffff;
  box-shadow: 0 24px 70px rgb(15 23 42 / 15%);
}

.delete-dialog-icon {
  display: flex;
  width: 52px;
  height: 52px;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
  border: 1px solid #fecaca;
  border-radius: 16px;
  background: #fef2f2;
  color: #dc2626;
  font-size: 20px;
}

.delete-dialog-title {
  color: #201b32;
  font-size: 20px;
  font-weight: 750;
  letter-spacing: -0.04em;
}

.delete-dialog-description {
  margin-top: 10px;
  color: #777b8b;
  font-size: 13px;
  line-height: 1.8;
}

.delete-dialog-description strong {
  color: #302b45;
  font-weight: 700;
}

.delete-dialog-notice {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  margin-top: 18px;
  padding: 12px;
  border: 1px solid #f1e8d6;
  border-radius: 11px;
  background: #fffbeb;
  color: #92702a;
  font-size: 11px;
  line-height: 1.7;
}

.delete-dialog-notice i {
  margin-top: 3px;
}

.delete-dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 26px;
}

.delete-cancel-btn,
.delete-confirm-btn {
  min-height: 40px !important;
  padding: 0 16px !important;
  border-radius: 10px !important;
  font-size: 12px !important;
  font-weight: 650 !important;
  letter-spacing: 0 !important;
  text-transform: none !important;
}

.delete-cancel-btn {
  border-color: #e5e7eb !important;
  background: #ffffff !important;
  color: #525466 !important;
}

.delete-cancel-btn:hover:not(:disabled) {
  background: #f8fafc !important;
}

.delete-confirm-btn {
  background: #dc2626 !important;
  color: #ffffff !important;
  box-shadow: 0 3px 8px rgb(220 38 38 / 15%) !important;
}

.delete-confirm-btn:hover:not(:disabled) {
  background: #b91c1c !important;
}

@media (max-width: 480px) {
  .delete-dialog {
    padding: 22px;
  }

  .delete-dialog-actions {
    flex-direction: column-reverse;
  }

  .delete-dialog-actions > * {
    width: 100%;
  }
}
.category-manager {
  width: 100%;
  overflow: hidden;
  border: 1px solid #eceef4;
  border-radius: 18px;
  background: #ffffff;
  color: #17152b;
  box-shadow: 0 3px 12px rgb(15 23 42 / 3%);
}

/* Header */
.category-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 22px 24px;
  border-bottom: 1px solid #f0f1f5;
}

.category-heading {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 13px;
}

.category-heading-icon {
  display: flex;
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border: 1px solid #e8e0ff;
  border-radius: 13px;
  background: #f5f1ff;
  color: #5c2ecd;
  font-size: 17px;
}

.category-title {
  color: #222039;
  font-size: 16px;
  font-weight: 750;
  letter-spacing: -0.035em;
}

.category-subtitle {
  margin-top: 5px;
  color: #858b9b;
  font-size: 12px;
  line-height: 1.6;
}

.category-count {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 6px;
  padding: 7px 11px;
  border: 1px solid #eeebf8;
  border-radius: 999px;
  background: #faf9ff;
  color: #77728b;
  font-size: 11px;
  font-weight: 600;
}

.category-count span {
  color: #5c2ecd;
  font-size: 13px;
  font-weight: 750;
}

/* Form */
.category-form {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  padding: 22px 24px;
  border-bottom: 1px solid #f0f1f5;
  background: #fcfbff;
}

.category-input-wrap {
  min-width: 0;
  flex: 1;
}

.category-input-label {
  display: block;
  margin-bottom: 8px;
  color: #49445e;
  font-size: 12px;
  font-weight: 650;
}

.category-input-icon {
  color: #9388b1;
  font-size: 14px;
}

.category-input {
  min-width: 0;
}

.category-input :deep(.v-field) {
  border-radius: 11px;
  background: #ffffff;
  font-size: 13px;
}

.category-input :deep(.v-field--focused) {
  box-shadow: 0 0 0 3px rgb(92 46 205 / 8%);
}

.category-input :deep(.v-field__outline) {
  color: #e5e1ee;
}

.category-input :deep(.v-field--focused .v-field__outline) {
  color: #5c2ecd;
}

.category-input :deep(input::placeholder) {
  color: #a5a7b4;
  opacity: 1;
}

.category-add-btn {
  min-height: 44px !important;
  padding: 0 18px !important;
  border-radius: 11px !important;
  background: #5c2ecd !important;
  color: #ffffff !important;
  font-size: 12px !important;
  font-weight: 650 !important;
  letter-spacing: 0 !important;
  text-transform: none !important;
  box-shadow: 0 3px 8px rgb(92 46 205 / 16%) !important;
  transition:
    background 180ms ease,
    box-shadow 180ms ease,
    transform 180ms ease !important;
}

.category-add-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  background: #4820ad !important;
  box-shadow: 0 5px 12px rgb(92 46 205 / 22%) !important;
}

.category-add-btn:disabled {
  box-shadow: none !important;
  opacity: 0.55;
}

/* Error */
.category-error {
  margin: 16px 24px 0;
  border-radius: 11px !important;
  font-size: 12px;
}

/* Category content */
.category-content {
  padding: 22px 24px;
}

.category-list-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 14px;
  color: #8b8b9d;
  font-size: 10px;
  font-weight: 750;
  letter-spacing: 0.075em;
}

.category-list-hint {
  color: #a0a3b0;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0;
}

.category-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.category-item {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 11px;
  padding: 13px;
  border: 1px solid #eceef4;
  border-radius: 13px;
  background: #ffffff;
  transition:
    border-color 180ms ease,
    background 180ms ease,
    box-shadow 180ms ease;
}

.category-item:hover {
  border-color: #ddd4fa;
  background: #fdfcff;
  box-shadow: 0 3px 10px rgb(30 10 94 / 4%);
}

.category-item-icon {
  display: flex;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: #f5f1ff;
  color: #5c2ecd;
  font-size: 14px;
}

.category-item-info {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 5px;
}

.category-item-name {
  overflow-wrap: anywhere;
  color: #302b45;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.5;
}

.global-label,
.custom-label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  font-weight: 550;
}

.global-label {
  color: #77728b;
}

.custom-label {
  color: #8b7bc4;
}

.category-delete-btn {
  display: flex;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: 9px;
  background: transparent;
  color: #9ca3b1;
  cursor: pointer;
  transition: all 180ms ease;
}

.category-delete-btn:hover:not(:disabled) {
  border-color: #fecaca;
  background: #fef2f2;
  color: #dc2626;
}

.category-delete-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.global-lock {
  display: flex;
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  background: #f5f6f9;
  color: #a1a5b2;
  font-size: 11px;
}

/* Empty state */
.category-empty {
  display: flex;
  align-items: center;
  flex-direction: column;
  padding: 42px 24px;
  text-align: center;
}

.category-empty-icon {
  display: flex;
  width: 56px;
  height: 56px;
  align-items: center;
  justify-content: center;
  margin-bottom: 15px;
  border: 1px solid #e8e0ff;
  border-radius: 17px;
  background: #f5f1ff;
  color: #5c2ecd;
  font-size: 22px;
}

.category-empty h4 {
  color: #302b45;
  font-size: 14px;
  font-weight: 750;
}

.category-empty p {
  max-width: 340px;
  margin-top: 7px;
  color: #858b9b;
  font-size: 12px;
  line-height: 1.8;
}

/* Loading */
.category-loading {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  padding: 22px 24px;
}

.category-skeleton {
  height: 64px;
  border-radius: 13px;
  background: linear-gradient(
    90deg,
    #f0f2f7 25%,
    #e7eaf1 50%,
    #f0f2f7 75%
  );
  background-size: 200% 100%;
  animation: category-shimmer 1.5s infinite linear;
}

@keyframes category-shimmer {
  from {
    background-position: 100% 0;
  }

  to {
    background-position: -100% 0;
  }
}

/* Footer */
.category-footer {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding: 14px 24px;
  border-top: 1px solid #f0f1f5;
  background: #fcfbff;
  color: #9391a3;
  font-size: 10px;
  line-height: 1.7;
}

.category-footer i {
  margin-top: 2px;
  color: #8e7acb;
}

/* Responsive */
@media (max-width: 640px) {
  .category-header {
    align-items: flex-start;
    padding: 18px;
  }

  .category-heading {
    align-items: flex-start;
    gap: 10px;
  }

  .category-heading-icon {
    width: 36px;
    height: 36px;
    font-size: 14px;
  }

  .category-title {
    font-size: 14px;
  }

  .category-subtitle {
    font-size: 11px;
  }

  .category-form {
    align-items: stretch;
    flex-direction: column;
    padding: 18px;
  }

  .category-add-btn {
    width: 100%;
  }

  .category-content {
    padding: 18px;
  }

  .category-list {
    grid-template-columns: minmax(0, 1fr);
  }

  .category-loading {
    grid-template-columns: minmax(0, 1fr);
    padding: 18px;
  }

  .category-list-hint {
    line-height: 1.6;
  }

  .category-footer {
    padding: 13px 18px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .category-item,
  .category-add-btn {
    transition: none !important;
  }

  .category-skeleton {
    animation: none;
  }
}
</style>