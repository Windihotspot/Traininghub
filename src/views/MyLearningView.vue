<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { LmsService } from '@/services/lms'
import { useAsyncAction } from '@/composables/useAsyncAction'
import AccountMenu from '@/components/traininghub/AccountMenu.vue'
import type { MyCourse } from '@/types/lms'

const courses = ref<MyCourse[]>([])
const { loading, error, run } = useAsyncAction()
onMounted(() => run(async () => { courses.value = (await LmsService.myCourses()).courses }))
</script>

<template>
  <main class="min-h-screen bg-gray-50 py-10 px-4">
    <div class="max-w-5xl mx-auto">
      <div class="flex justify-between items-center mb-6"><h1 class="text-2xl font-bold">My learning</h1><AccountMenu /></div>
      <div v-if="loading" class="text-center py-16"><v-progress-circular indeterminate color="primary" /></div>
      <v-alert v-else-if="error" type="error" variant="tonal">{{ error.message }}</v-alert>
      <p v-else-if="!courses.length" class="text-gray-500">You are not enrolled in any course yet.</p>
      <div class="grid md:grid-cols-3 gap-4">
        <router-link v-for="c in courses" :key="c.enrollment_id" :to="{ name: 'learn', params: { trainingId: c.training_id } }"
          class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition">
          <img v-if="c.cover_image" :src="c.cover_image" class="h-32 w-full object-cover" alt="" />
          <div class="p-4"><b>{{ c.title }}</b>
            <v-progress-linear :model-value="c.progress_percent" color="primary" height="6" rounded class="my-2" />
            <span class="text-xs text-gray-500">{{ c.status === 'completed' ? 'Completed' : `${c.progress_percent}%` }}</span></div>
        </router-link>
      </div>
    </div>
  </main>
</template>
