<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { RegistrationsService } from '@/services/traininghub'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { formatMoney, formatDate } from '@/utils/format'
import type { RegistrationRow } from '@/types/traininghub'

const props = defineProps<{
  organisationId: string
  canUpdate?: boolean
}>()

const rows = ref<RegistrationRow[]>([])
const search = ref('')
const regStatus = ref<string | null>(null)
const payStatus = ref<string | null>(null)
const open = ref<Set<string>>(new Set())
const notes = ref<Record<string, string>>({})

const { loading, error, run } = useAsyncAction()

watch(
  () => props.organisationId,
  (id) =>
    run(async () => {
      rows.value = []
      notes.value = {}
      open.value = new Set()

      if (!id) return

      rows.value = await RegistrationsService.listForOrg(id)

      notes.value = Object.fromEntries(
        rows.value.map((r) => [r.id, r.notes ?? '']),
      )
    }),
  { immediate: true },
)

const payOf = (r: RegistrationRow) =>
  r.payments?.find((p) => p.status === 'paid') ?? r.payments?.[0]

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()

  return rows.value.filter(
    (r) =>
      (!regStatus.value || r.status === regStatus.value) &&
      (!payStatus.value || payOf(r)?.status === payStatus.value) &&
      (!q ||
        [
          r.reference,
          r.contact_name,
          r.contact_email,
          r.company_name,
          r.trainings?.title,
        ].some((v) => v?.toLowerCase().includes(q))),
  )
})

const stats = computed(() => ({
  total: rows.value.length,
  confirmed: rows.value.filter((r) => r.status === 'confirmed').length,
  paid: rows.value.filter((r) => payOf(r)?.status === 'paid').length,
  pending: rows.value.filter((r) => r.status === 'pending').length,
}))

function toggle(id: string) {
  const next = new Set(open.value)

  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }

  open.value = next
}

function color(status?: string): string {
  const colors: Record<string, string> = {
    confirmed: 'success',
    paid: 'success',
    pending: 'warning',
    processing: 'warning',
    cancelled: 'error',
    failed: 'error',
    refunded: 'info',
    waitlisted: 'info',
  }

  return colors[status ?? ''] ?? 'secondary'
}

function statusLabel(status?: string) {
  if (!status) return 'Not available'

  return status.charAt(0).toUpperCase() + status.slice(1).replaceAll('_', ' ')
}

async function saveNotes(r: RegistrationRow) {
  await run(async () => {
    await RegistrationsService.updateNotes(r.id, notes.value[r.id])
    r.notes = notes.value[r.id] || null
    return true
  })
}

async function cancel(r: RegistrationRow) {
  if (
    !window.confirm(
      `Cancel ${r.reference}? This does not refund any payment.`,
    )
  ) {
    return
  }

  await run(async () => {
    await RegistrationsService.updateStatus(r.id, 'cancelled')
    r.status = 'cancelled'
    return true
  })
}

async function attend(
  participant: RegistrationRow['registration_participants'][number],
  attended: boolean,
) {
  await run(async () => {
    await RegistrationsService.setAttended(participant.id, attended)
    participant.attended = attended
    return true
  })
}
function clearFilters() {
  search.value = ''
  regStatus.value = null
  payStatus.value = null
}
</script>

<template>
  <main class="min-w-0 space-y-6 text-[#17143f]">
   
    <!-- Summary cards -->
    <!-- <section class="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <article
        class="rounded-2xl border border-[#e9e5fa] bg-white p-4 shadow-sm sm:p-5"
      >
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-semibold text-slate-500 sm:text-sm">
            Total registrations
          </span>

          <span
            class="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f0edff] text-[#39218f]"
          >
            <i class="fa-solid fa-clipboard-list" />
          </span>
        </div>

        <p class="mt-4 text-2xl font-extrabold sm:text-3xl">
          {{ stats.total }}
        </p>

        <p class="mt-1 text-xs text-slate-500">
          All submitted registrations
        </p>
      </article>

      <article
        class="rounded-2xl border border-[#e9e5fa] bg-white p-4 shadow-sm sm:p-5"
      >
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-semibold text-slate-500 sm:text-sm">
            Confirmed
          </span>

          <span
            class="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"
          >
            <i class="fa-solid fa-circle-check" />
          </span>
        </div>

        <p class="mt-4 text-2xl font-extrabold text-emerald-700 sm:text-3xl">
          {{ stats.confirmed }}
        </p>

        <p class="mt-1 text-xs text-slate-500">
          Confirmed participants
        </p>
      </article>

      <article
        class="rounded-2xl border border-[#e9e5fa] bg-white p-4 shadow-sm sm:p-5"
      >
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-semibold text-slate-500 sm:text-sm">
            Payments received
          </span>

          <span
            class="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600"
          >
            <i class="fa-solid fa-wallet" />
          </span>
        </div>

        <p class="mt-4 text-2xl font-extrabold text-blue-700 sm:text-3xl">
          {{ stats.paid }}
        </p>

        <p class="mt-1 text-xs text-slate-500">
          Registrations with a paid payment
        </p>
      </article>

      <article
        class="rounded-2xl border border-[#e9e5fa] bg-white p-4 shadow-sm sm:p-5"
      >
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-semibold text-slate-500 sm:text-sm">
            Pending
          </span>

          <span
            class="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600"
          >
            <i class="fa-solid fa-clock" />
          </span>
        </div>

        <p class="mt-4 text-2xl font-extrabold text-amber-600 sm:text-3xl">
          {{ stats.pending }}
        </p>

        <p class="mt-1 text-xs text-slate-500">
          Awaiting confirmation
        </p>
      </article>
    </section> -->

    <!-- Error -->
    <v-alert
      v-if="error"
      type="error"
      variant="tonal"
      density="comfortable"
      class="rounded-xl"
      closable
    >
      {{ error.message }}
    </v-alert>

    <!-- Registrations panel -->
    <section
      class="overflow-hidden rounded-2xl border border-[#e9e5fa] bg-white shadow-sm"
    >
      <!-- Panel heading -->
      <div
        class="flex flex-col justify-between gap-3 border-b border-[#eeeaf8] px-5 py-5 sm:flex-row sm:items-center sm:px-6"
      >
        <div>
          <h2 class="text-lg font-bold">
            All registrations
          </h2>

          <p class="mt-1 text-sm text-slate-500">
            Search, filter, and select a registration to view its details.
          </p>
        </div>

        <span
          class="inline-flex w-fit items-center gap-2 rounded-lg bg-[#f5f2ff] px-3 py-2 text-xs font-semibold text-[#39218f]"
        >
          <i class="fa-solid fa-filter" />
          {{ filtered.length }} of {{ rows.length }}
        </span>
      </div>

      <!-- Search and filters -->
      <div class="grid gap-3 border-b border-[#eeeaf8] bg-[#fdfcff] p-4 sm:p-5 md:grid-cols-2 xl:grid-cols-3">
        <v-text-field
          v-model="search"
          label="Search registrations"
          placeholder="Reference, name, email, company..."
          variant="outlined"
          density="comfortable"
          hide-details
          clearable
          bg-color="white"
          class="training-filter"
        >
          <template #prepend-inner>
            <i class="fa-solid fa-magnifying-glass text-slate-400" />
          </template>
        </v-text-field>

        <v-select
          v-model="regStatus"
          :items="[
            { title: 'Pending', value: 'pending' },
            { title: 'Confirmed', value: 'confirmed' },
            { title: 'Cancelled', value: 'cancelled' },
            { title: 'Waitlisted', value: 'waitlisted' },
          ]"
          label="Registration status"
          variant="outlined"
          density="comfortable"
          hide-details
          clearable
          bg-color="white"
          class="training-filter"
        />

        <v-select
          v-model="payStatus"
          :items="[
            { title: 'Pending', value: 'pending' },
            { title: 'Processing', value: 'processing' },
            { title: 'Paid', value: 'paid' },
            { title: 'Failed', value: 'failed' },
            { title: 'Cancelled', value: 'cancelled' },
            { title: 'Refunded', value: 'refunded' },
          ]"
          label="Payment status"
          variant="outlined"
          density="comfortable"
          hide-details
          clearable
          bg-color="white"
          class="training-filter"
        />
      </div>

      <!-- Loading -->
      <div
        v-if="loading && !rows.length"
        class="flex min-h-64 flex-col items-center justify-center gap-4 p-8"
      >
        <div
          class="h-10 w-10 animate-spin rounded-full border-4 border-[#e9e5fa] border-t-[#39218f]"
        />

        <p class="text-sm font-medium text-slate-500">
          Loading registrations...
        </p>
      </div>

      <!-- Table -->
      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[1050px] border-collapse text-left">
          <thead>
            <tr class="bg-[#faf9ff]">
              <th class="w-12 px-5 py-4"></th>

              <th
                class="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500"
              >
                Registration
              </th>

              <th
                class="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500"
              >
                Training
              </th>

              <th
                class="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500"
              >
                Contact
              </th>

              <th
                class="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500"
              >
                People
              </th>

              <th
                class="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500"
              >
                Total
              </th>

              <th
                class="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500"
              >
                Status
              </th>

              <th
                class="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500"
              >
                Payment
              </th>

              <th
                class="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500"
              >
                Date
              </th>
            </tr>
          </thead>

          <tbody>
            <template v-for="r in filtered" :key="r.id">
              <!-- Registration row -->
              <tr
                class="cursor-pointer border-t border-[#f0edf8] transition-colors hover:bg-[#faf9ff]"
                :class="{ 'bg-[#f8f6ff]': open.has(r.id) }"
                @click="toggle(r.id)"
              >
                <td class="px-5 py-4 text-[#5140b8]">
                  <i
                    :class="[
                      'fa-solid',
                      open.has(r.id)
                        ? 'fa-chevron-down'
                        : 'fa-chevron-right',
                      'text-xs',
                    ]"
                  />
                </td>

                <td class="px-4 py-4">
                  <p class="text-sm font-bold text-[#39218f]">
                    {{ r.reference }}
                  </p>

                  <p class="mt-1 text-xs text-slate-400">
                    View details
                  </p>
                </td>

                <td class="max-w-[220px] px-4 py-4">
                  <p class="line-clamp-2 text-sm font-semibold text-[#17143f]">
                    {{ r.trainings?.title ?? 'Untitled training' }}
                  </p>
                </td>

                <td class="px-4 py-4">
                  <p class="text-sm font-semibold text-[#17143f]">
                    {{ r.company_name || r.contact_name }}
                  </p>

                  <p class="mt-1 text-xs text-slate-500">
                    {{ r.contact_email }}
                  </p>
                </td>

                <td class="px-4 py-4">
                  <span
                    class="inline-flex h-8 min-w-8 items-center justify-center rounded-lg bg-[#f0edff] px-2 text-sm font-bold text-[#39218f]"
                  >
                    {{ r.participant_count }}
                  </span>
                </td>

                <td class="whitespace-nowrap px-4 py-4">
                  <span class="text-sm font-bold text-[#17143f]">
                    {{ formatMoney(r.total_amount, r.currency) }}
                  </span>
                </td>

                <td class="px-4 py-4">
                  <span
                    class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                    :class="{
                      'bg-emerald-50 text-emerald-700': r.status === 'confirmed',
                      'bg-amber-50 text-amber-700': r.status === 'pending',
                      'bg-red-50 text-red-700': r.status === 'cancelled',
                      'bg-blue-50 text-blue-700': r.status === 'waitlisted',
                    }"
                  >
                    <span
                      class="h-1.5 w-1.5 rounded-full"
                      :class="{
                        'bg-emerald-500': r.status === 'confirmed',
                        'bg-amber-500': r.status === 'pending',
                        'bg-red-500': r.status === 'cancelled',
                        'bg-blue-500': r.status === 'waitlisted',
                      }"
                    />

                    {{ statusLabel(r.status) }}
                  </span>
                </td>

                <td class="px-4 py-4">
                  <span
                    class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold"
                    :class="{
                      'bg-emerald-50 text-emerald-700': payOf(r)?.status === 'paid',
                      'bg-amber-50 text-amber-700':
                        ['pending', 'processing'].includes(payOf(r)?.status ?? ''),
                      'bg-red-50 text-red-700':
                        ['failed', 'cancelled'].includes(payOf(r)?.status ?? ''),
                      'bg-blue-50 text-blue-700': payOf(r)?.status === 'refunded',
                      'bg-slate-100 text-slate-600': !payOf(r)?.status,
                    }"
                  >
                    {{ statusLabel(payOf(r)?.status ?? undefined) }}
                  </span>
                </td>

                <td class="whitespace-nowrap px-4 py-4 text-sm text-slate-500">
                  {{ formatDate(r.created_at) }}
                </td>
              </tr>

              <!-- Expanded details -->
              <tr v-if="open.has(r.id)">
                <td colspan="9" class="border-t border-[#e9e5fa] bg-[#faf9ff] p-0">
                  <div class="grid gap-6 p-5 sm:p-7 xl:grid-cols-2">
                    <!-- Participants -->
                    <section
                      class="rounded-2xl border border-[#e9e5fa] bg-white p-5"
                    >
                      <div
                        class="flex items-center justify-between gap-3 border-b border-[#eeeaf8] pb-4"
                      >
                        <div>
                          <h3 class="font-bold text-[#17143f]">
                            Participants
                          </h3>

                          <p class="mt-1 text-xs text-slate-500">
                            Manage attendance for this registration.
                          </p>
                        </div>

                        <span
                          class="rounded-lg bg-[#f0edff] px-3 py-1.5 text-xs font-bold text-[#39218f]"
                        >
                          {{ r.registration_participants?.length ?? 0 }}
                        </span>
                      </div>

                      <div
                        v-if="!r.registration_participants?.length"
                        class="py-8 text-center"
                      >
                        <i class="fa-solid fa-users text-2xl text-slate-300" />

                        <p class="mt-2 text-sm text-slate-500">
                          No participant details available.
                        </p>
                      </div>

                      <div
                        v-for="rp in r.registration_participants"
                        :key="rp.id"
                        class="flex flex-col justify-between gap-3 border-b border-[#f0edf8] py-4 last:border-b-0 sm:flex-row sm:items-center"
                      >
                        <div class="flex min-w-0 items-start gap-3">
                          <div
                            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f0edff] text-[#39218f]"
                          >
                            <i class="fa-solid fa-user" />
                          </div>

                          <div class="min-w-0">
                            <p class="text-sm font-semibold text-[#17143f]">
                              {{ rp.participants?.first_name }}
                              {{ rp.participants?.last_name }}
                            </p>

                            <p
                              class="mt-1 break-all text-xs text-slate-500"
                            >
                              {{ rp.participants?.email || 'No email provided' }}
                            </p>

                            <p
                              v-if="rp.participants?.job_title"
                              class="mt-1 text-xs text-slate-400"
                            >
                              {{ rp.participants.job_title }}
                            </p>
                          </div>
                        </div>

                        <v-checkbox
                          :model-value="rp.attended"
                          label="Attended"
                          color="success"
                          density="compact"
                          hide-details
                          :disabled="!canUpdate || loading"
                          class="shrink-0"
                          @click.stop
                          @update:model-value="
                            (v: boolean | null) => attend(rp, !!v)
                          "
                        />
                      </div>
                    </section>

                    <!-- Internal notes and actions -->
                    <section
                      class="rounded-2xl border border-[#e9e5fa] bg-white p-5"
                    >
                      <div class="border-b border-[#eeeaf8] pb-4">
                        <div class="flex items-center gap-3">
                          <span
                            class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f0edff] text-[#39218f]"
                          >
                            <i class="fa-solid fa-note-sticky" />
                          </span>

                          <div>
                            <h3 class="font-bold text-[#17143f]">
                              Internal notes
                            </h3>

                            <p class="mt-1 text-xs text-slate-500">
                              Private notes for your organisation.
                            </p>
                          </div>
                        </div>
                      </div>

                      <v-textarea
                        v-model="notes[r.id]"
                        label="Registration notes"
                        placeholder="Add relevant information about this registration..."
                        rows="4"
                        auto-grow
                        variant="outlined"
                        density="comfortable"
                        hide-details
                        class="mt-5 training-filter"
                        :disabled="!canUpdate || loading"
                        @click.stop
                      />

                      <div
                        v-if="canUpdate"
                        class="mt-4 flex flex-col gap-3 sm:flex-row"
                      >
                        <v-btn
                          color="primary"
                          variant="flat"
                          rounded="lg"
                          :loading="loading"
                          :disabled="loading"
                          @click.stop="saveNotes(r)"
                        >
                          <i class="fa-solid fa-floppy-disk mr-2" />
                          Save notes
                        </v-btn>

                        <v-btn
                          v-if="r.status !== 'cancelled'"
                          color="error"
                          variant="tonal"
                          rounded="lg"
                          :disabled="loading"
                          @click.stop="cancel(r)"
                        >
                          <i class="fa-solid fa-ban mr-2" />
                          Cancel registration
                        </v-btn>
                      </div>

                      <div
                        v-else
                        class="mt-4 flex items-start gap-2 rounded-xl bg-[#f7f5ff] p-3 text-xs leading-5 text-slate-500"
                      >
                        <i class="fa-solid fa-lock mt-0.5 text-[#5140b8]" />

                        You have read-only access to registration notes and actions.
                      </div>

                      <div
                        class="mt-5 flex items-start gap-2 rounded-xl border border-[#eeeaf8] bg-[#faf9ff] p-3 text-xs leading-5 text-slate-500"
                      >
                        <i class="fa-solid fa-circle-info mt-0.5 text-[#5140b8]" />

                        Cancelling a registration does not automatically refund
                        any payment.
                      </div>
                    </section>
                  </div>
                </td>
              </tr>
            </template>

            <!-- Empty state -->
            <tr v-if="!filtered.length">
              <td colspan="9" class="px-5 py-16 text-center">
                <div
                  class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#f0edff] text-2xl text-[#39218f]"
                >
                  <i class="fa-solid fa-clipboard-list" />
                </div>

                <h3 class="mt-4 font-bold text-[#17143f]">
                  {{ rows.length ? 'No matching registrations' : 'No registrations yet' }}
                </h3>

                <p class="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                  {{
                    rows.length
                      ? 'Try changing your search term or clearing the status filters.'
                      : 'Registrations for your training programmes will appear here.'
                  }}
                </p>

                <button
                  v-if="search || regStatus || payStatus"
                  type="button"
                  class="mt-4 inline-flex items-center gap-2 rounded-xl border border-[#d9d1f3] px-4 py-2.5 text-sm font-semibold text-[#39218f] transition hover:bg-[#f5f2ff]"
                  @click="clearFilters"
                >
                  <i class="fa-solid fa-filter-circle-xmark" />
                  Clear filters
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Table footer -->
      <footer
        v-if="filtered.length"
        class="flex flex-col justify-between gap-2 border-t border-[#eeeaf8] bg-[#fdfcff] px-5 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:px-6"
      >
        <span>
          Showing
          <strong class="text-[#17143f]">{{ filtered.length }}</strong>
          of
          <strong class="text-[#17143f]">{{ rows.length }}</strong>
          registrations
        </span>

        <span class="inline-flex items-center gap-2">
          <i class="fa-solid fa-shield-halved text-[#5140b8]" />
          Registration data is organisation-specific.
        </span>
      </footer>
    </section>
  </main>
</template>

<style scoped>
.training-filter :deep(.v-field) {
  border-radius: 12px;
}

.training-filter :deep(.v-field__outline) {
  --v-field-border-opacity: 0.18;
}

.training-filter :deep(.v-field--focused .v-field__outline) {
  --v-field-border-opacity: 1;
}

.training-filter :deep(.v-label) {
  font-size: 13px;
}

:deep(.v-checkbox .v-label) {
  font-size: 13px;
}

@media (prefers-reduced-motion: reduce) {
  :deep(*) {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
</style>