
<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue'
import { useOrgContext } from '@/composables/useOrgContext'
import MainLayout from '@/layouts/full/MainLayout.vue'
import AccountMenu from '@/components/traininghub/AccountMenu.vue'
import OrgStats from '@/components/traininghub/OrgStats.vue'
import OrgTrainingsList from '@/components/traininghub/OrgTrainingsList.vue'
import CategoriesManager from '@/components/traininghub/CategoriesManager.vue'
import RegistrationsTable from '@/components/traininghub/RegistrationsTable.vue'
import PaymentsTable from '@/components/traininghub/PaymentsTable.vue'
import MembersManager from '@/components/traininghub/MembersManager.vue'
import AuditLogTable from '@/components/traininghub/AuditLogTable.vue'
import OrgProfileForm from '@/components/traininghub/OrgProfileForm.vue'
import ExportRegistrationsButton from '@/components/traininghub/ExportRegistrationsButton.vue'

const {
  orgs,
  activeOrgId,
  activeOrg,
  isPlatformAdmin,
  canAssignOwner,
  can,
  loading,
  error,
  load,
} = useOrgContext()

const tab = ref('trainings')

const tabs = computed(() => [
  {
    value: 'trainings',
    label: 'Trainings',
    icon: 'fa-chalkboard-user',
    description: 'Create and manage training programmes',
    show: can('training.view'),
  },
  {
    value: 'registrations',
    label: 'Registrations',
    icon: 'fa-clipboard-list',
    description: 'Manage participant registrations',
    show: can('registration.view'),
  },
  {
    value: 'payments',
    label: 'Payments',
    icon: 'fa-credit-card',
    description: 'Review training payments',
    show: can('payment.view'),
  },
  {
    value: 'members',
    label: 'Team members',
    icon: 'fa-users',
    description: 'Manage your organisation team',
    show: can('user.manage'),
  },
  {
    value: 'activity',
    label: 'Activity',
    icon: 'fa-clock-rotate-left',
    description: 'Review recent organisation activity',
    show: can('audit.view'),
  },
  {
    value: 'settings',
    label: 'Settings',
    icon: 'fa-gear',
    description: 'Manage your organisation profile',
    show: can('organisation.manage'),
  },
].filter(item => item.show))

const currentTab = computed(
  () => tabs.value.find(item => item.value === tab.value),
)

watch(tabs, availableTabs => {
  if (
    availableTabs.length &&
    !availableTabs.some(item => item.value === tab.value)
  ) {
    tab.value = availableTabs[0].value
  }
})

onMounted(load)
</script>

<template>
  <MainLayout>
    <main class="th-dashboard">
    <div class="dashboard-container">
      <!-- Top navigation -->
      <!-- <header class="dashboard-header">
        <RouterLink to="/" class="th-brand">
          <span class="brand-icon">
            <i class="fa-solid fa-graduation-cap"></i>
          </span>

          <span class="brand-copy">
            <strong>TrainHub</strong>
            <small>TRAINING MANAGEMENT</small>
          </span>
        </RouterLink>

        <div class="header-right">
          <div class="header-context">
            <span class="context-indicator"></span>
            <span>Organisation workspace</span>
          </div>

          <div class="header-divider"></div>

          <v-btn
            v-if="isPlatformAdmin"
            class="platform-admin-button"
            variant="tonal"
            :to="{ name: 'admin-organisations' }"
            prepend-icon="fa-solid fa-building-shield"
            rounded="lg"
          >
            Platform admin
          </v-btn>

          <AccountMenu />
        </div>
      </header> -->

      <div class="header-rule"></div>

      <!-- Page introduction -->
      <section class="welcome-section">
       

         <div class="welcome-actions flex justify-end ml-auto">
          <v-btn
            v-if="activeOrgId && can('training.create')"
            class="create-training-button"
            color="primary"
            :to="{
              name: 'training-new',
              query: { org: activeOrgId },
            }"
            rounded="lg"
            size="large"
            elevation="0"
          >
            <i class="fa-solid fa-plus mr-2"></i>
            New training
          </v-btn>
        </div>
      </section>

      <!-- Organisation selector -->
      <!-- <section
        v-if="orgs.length"
        class="organisation-bar"
      >
        <div class="organisation-identity">
          <div class="organisation-icon">
            <i class="fa-solid fa-building"></i>
          </div>

          <div class="organisation-copy">
            <span class="field-caption">CURRENT ORGANISATION</span>

            <strong>
              {{ activeOrg?.name || 'Select an organisation' }}
            </strong>
          </div>
        </div>

        <div
          v-if="orgs.length > 1"
          class="organisation-selector"
        >
          <v-select
            v-model="activeOrgId"
            :items="orgs"
            item-title="name"
            item-value="id"
            label="Switch organisation"
            variant="outlined"
            density="comfortable"
            hide-details
            class="organisation-select"
            aria-label="Switch organisation"
          />
        </div>

        <div v-else class="organisation-status">
          <span class="status-dot"></span>
          Workspace
        </div>
      </section> -->

      <!-- Error state -->
      <v-alert
        v-if="error"
        class="dashboard-alert"
        type="error"
        variant="tonal"
        rounded="lg"
        closable
      >
        {{ error.message }}
      </v-alert>

      <!-- Loading state -->
      <section
        v-if="loading"
        class="loading-panel"
        aria-live="polite"
      >
        <v-progress-circular
          indeterminate
          color="primary"
          size="36"
          width="3"
        />

        <strong>Preparing your workspace</strong>

        <span>Loading your organisation and dashboard data...</span>
      </section>

  

      <!-- Main workspace -->
      <template v-else-if="activeOrgId">
        <!-- Overview stats -->
        <section
          v-if="can('registration.view')"
          class="stats-section"
        >
   

          <OrgStats
            :key="activeOrgId"
            :organisation-id="activeOrgId"
          />
        </section>

        <!-- Main navigation and actions -->
        <section class="workspace-section">
          <div class="workspace-heading">
            <div class="section-heading">
              <div>

                <h2>{{ currentTab?.label || 'Workspace' }}</h2>

                <p class="workspace-description">
                  {{
                    currentTab?.description ||
                    'Manage your organisation workspace.'
                  }}
                </p>
              </div>
            </div>

            <div class="workspace-actions">
              <!-- <ExportRegistrationsButton
                v-if="can('registration.export')"
                :organisation-id="activeOrgId"
              /> -->

              <v-btn
                v-if="tab === 'trainings' && can('training.create')"
                class="mobile-create-button"
                color="primary"
                :to="{
                  name: 'training-new',
                  query: { org: activeOrgId },
                }"
                rounded="lg"
                elevation="0"
              >
                <i class="fa-solid fa-plus mr-2"></i>
                New training
              </v-btn>
            </div>
          </div>

          <!-- Tab navigation -->
          <nav class="workspace-tabs" aria-label="Workspace sections">
            <button
              v-for="item in tabs"
              :key="item.value"
              type="button"
              class="workspace-tab"
              :class="{ 'workspace-tab-active': tab === item.value }"
              :aria-current="tab === item.value ? 'page' : undefined"
              @click="tab = item.value"
            >
              <i :class="['fa-solid', item.icon]"></i>
              <span>{{ item.label }}</span>
            </button>
          </nav>

          <!-- Workspace content -->
          <div class="workspace-content">
            <section
              v-if="tab === 'trainings'"
              class="content-section"
            >
              <OrgTrainingsList
                :key="activeOrgId"
                :organisation-id="activeOrgId"
                :org-slug="activeOrg?.slug"
                :can-edit="can('training.update')"
                :can-publish="can('training.publish')"
              />

              <section
                v-if="can('training.update')"
                class="mt-4"
              >
               

                <CategoriesManager
                  :key="activeOrgId"
                  :organisation-id="activeOrgId"
                />
              </section>
            </section>

            <RegistrationsTable
              v-else-if="tab === 'registrations'"
              :key="activeOrgId"
              :organisation-id="activeOrgId"
              :can-update="can('registration.update')"
            />

            <PaymentsTable
              v-else-if="tab === 'payments'"
              :key="activeOrgId"
              :organisation-id="activeOrgId"
            />

            <section
              v-else-if="tab === 'members'"
              class="content-card"
            >
              <div class="content-card-heading">
                <div class="subsection-icon">
                  <i class="fa-solid fa-users"></i>
                </div>

                <div>
                  <h3>Organisation members</h3>
                  <p>
                    Manage team access and member responsibilities.
                  </p>
                </div>
              </div>

              <MembersManager
                :key="activeOrgId"
                :organisation-id="activeOrgId"
                :can-assign-owner="canAssignOwner"
              />
            </section>

            <section
              v-else-if="tab === 'activity'"
              class="content-card"
            >
              <div class="content-card-heading">
                <div class="subsection-icon">
                  <i class="fa-solid fa-clock-rotate-left"></i>
                </div>

                <div>
                  <h3>Organisation activity</h3>
                  <p>
                    Review recorded actions within your workspace.
                  </p>
                </div>
              </div>

              <AuditLogTable
                :key="activeOrgId"
                :organisation-id="activeOrgId"
              />
            </section>

            <section
              v-else-if="tab === 'settings'"
              class="content-card settings-card"
            >
              <div class="content-card-heading">
                <div class="subsection-icon">
                  <i class="fa-solid fa-gear"></i>
                </div>

                <div>
                  <h3>Organisation settings</h3>
                  <p>
                    Update your organisation's profile and contact details.
                  </p>
                </div>
              </div>

              <OrgProfileForm
                :key="activeOrgId"
                :organisation-id="activeOrgId"
              />
            </section>
          </div>
        </section>
      </template>

      <!-- Footer -->
      <footer class="dashboard-footer">
        <RouterLink to="/" class="footer-brand">
          <i class="fa-solid fa-graduation-cap"></i>
          TrainHub
        </RouterLink>

        <span>Everything you need to manage training, in one place.</span>
      </footer>
    </div>
  </main>
  </MainLayout>
  
</template>

<style scoped>
.th-dashboard {
  --th-purple: #29143d;
  --th-purple-dark: #21102f;
  --th-purple-soft: #f3edf9;
  --th-purple-mid: #654284;
  --th-gold: #f7c948;
  --th-text: #292231;
  --th-muted: #83798e;
  --th-border: #eae5ef;
  --th-page: #faf9fc;

  min-height: 100vh;
  padding: 0 32px 28px;
  background: var(--th-page);
  color: var(--th-text);
  font-family: 'DM Sans', 'Inter', sans-serif;
}

.th-dashboard *,
.th-dashboard *::before,
.th-dashboard *::after {
  box-sizing: border-box;
}

.dashboard-container {
  margin: 0 auto;
}

/* Header */

.dashboard-header {
  min-height: 84px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.th-brand {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  color: var(--th-purple);
  text-decoration: none;
  flex-shrink: 0;
}

.brand-icon {
  width: 43px;
  height: 43px;
  display: grid;
  place-items: center;
  border-radius: 13px;
  background: var(--th-purple);
  color: var(--th-gold);
  font-size: 20px;
  box-shadow: 0 4px 12px rgba(41, 20, 61, 0.12);
}

.brand-copy {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.brand-copy strong {
  font-family: 'Manrope', 'DM Sans', sans-serif;
  font-size: 19px;
  font-weight: 800;
  letter-spacing: -0.7px;
}

.brand-copy small {
  color: var(--th-muted);
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 1.2px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 18px;
}

.header-context {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #73687e;
  font-size: 12px;
  font-weight: 500;
}

.context-indicator,
.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #35aa79;
  box-shadow: 0 0 0 3px rgba(53, 170, 121, 0.12);
}

.header-divider {
  width: 1px;
  height: 28px;
  background: var(--th-border);
}

.platform-admin-button {
  font-size: 11px;
  font-weight: 700;
}

.header-rule {
  height: 1px;
  background: var(--th-border);
}

/* Page heading */

.welcome-section {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  padding: 42px 0 30px;
}

.section-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #8d7b9f;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 1.25px;
}

.eyebrow-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--th-gold);
}

.welcome-copy h1 {
  margin: 12px 0 8px;
  color: var(--th-purple);
  font-family: 'Manrope', 'DM Sans', sans-serif;
  font-size: clamp(30px, 3.4vw, 39px);
  font-weight: 800;
  letter-spacing: -1.7px;
  line-height: 1.2;
}

.heading-period {
  color: var(--th-gold);
}

.welcome-copy > p {
  margin: 0;
  color: var(--th-muted);
  font-size: 12px;
  line-height: 1.8;
}

.create-training-button {
  min-height: 44px;
  padding: 0 18px;
  background: var(--th-purple) !important;
  color: #fff !important;
  font-size: 12px;
  font-weight: 700;
}

.create-training-button:hover {
  background: var(--th-purple-mid) !important;
}

/* Organisation selector */

.organisation-bar {
  min-height: 88px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 35px;
  padding: 16px 20px;
  border: 1px solid var(--th-border);
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 3px 12px rgba(41, 20, 61, 0.025);
}

.organisation-identity {
  display: flex;
  align-items: center;
  gap: 13px;
  min-width: 0;
}

.organisation-icon,
.empty-icon {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  border: 1px solid #e8dff0;
  border-radius: 12px;
  background: var(--th-purple-soft);
  color: var(--th-purple-mid);
  font-size: 17px;
}

.organisation-copy {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.field-caption {
  color: #96899f;
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 1.05px;
}

.organisation-copy strong {
  overflow: hidden;
  color: var(--th-purple);
  font-family: 'Manrope', 'DM Sans', sans-serif;
  font-size: 14px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.organisation-selector {
  width: min(300px, 45%);
  flex-shrink: 0;
}

.organisation-select {
  font-size: 12px;
}

.organisation-status {
  display: flex;
  align-items: center;
  gap: 9px;
  color: #7d7188;
  font-size: 11px;
}

/* Stats and section headings */

.stats-section {
  margin-bottom: 39px;
}

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.section-heading h2 {
  margin: 7px 0 0;
  color: var(--th-purple);
  font-family: 'Manrope', 'DM Sans', sans-serif;
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.6px;
}

.overview-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #91859b;
  font-size: 10px;
}

.overview-label i {
  color: var(--th-purple-mid);
}

/* Workspace navigation */

.workspace-section {
  min-width: 0;
}

.workspace-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 22px;
}

.workspace-description {
  margin: 7px 0 0;
  color: var(--th-muted);
  font-size: 11px;
  line-height: 1.7;
}

.workspace-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}

.mobile-create-button {
  display: none;
}

.workspace-tabs {
  display: flex;
  align-items: stretch;
  gap: 5px;
  overflow-x: auto;
  padding: 6px;
  border: 1px solid var(--th-border);
  border-radius: 12px 12px 0 0;
  background: #f5f2f8;
  scrollbar-width: thin;
}

.workspace-tab {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  min-height: 43px;
  flex: 0 0 auto;
  padding: 0 16px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: #7d7189;
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: background 0.18s, color 0.18s, border-color 0.18s;
}

.workspace-tab i {
  font-size: 12px;
}

.workspace-tab:hover {
  background: rgba(255, 255, 255, 0.7);
  color: var(--th-purple);
}

.workspace-tab:focus-visible {
  outline: 2px solid var(--th-purple-mid);
  outline-offset: 2px;
}

.workspace-tab-active {
  border-color: #e9e0f1;
  background: #fff;
  color: var(--th-purple);
  box-shadow: 0 2px 5px rgba(41, 20, 61, 0.045);
  font-weight: 800;
}

.workspace-tab-active i {
  color: #8b68a9;
}

.workspace-content {
  min-width: 0;
  padding-top: 23px;
}

.content-section {
  min-width: 0;
}

/* Cards */

.subsection-card,
.content-card {
  margin-top: 25px;
  padding: 24px;
  border: 1px solid var(--th-border);
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 3px 12px rgba(41, 20, 61, 0.025);
}

.content-card {
  margin-top: 0;
}

.subsection-heading,
.content-card-heading {
  display: flex;
  align-items: center;
  gap: 13px;
  margin-bottom: 23px;
  padding-bottom: 19px;
  border-bottom: 1px solid #f0ebf4;
}

.subsection-icon {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  border: 1px solid #e9e0f0;
  border-radius: 11px;
  background: #f7f3fb;
  color: var(--th-purple-mid);
  font-size: 15px;
}

.subsection-heading h3,
.content-card-heading h3 {
  margin: 0;
  color: var(--th-purple);
  font-family: 'Manrope', 'DM Sans', sans-serif;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: -0.3px;
}

.subsection-heading p,
.content-card-heading p {
  margin: 5px 0 0;
  color: var(--th-muted);
  font-size: 11px;
  line-height: 1.7;
}

/* Loading and empty states */

.dashboard-alert {
  margin: -12px 0 25px;
}

.loading-panel {
  min-height: 280px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 13px;
  padding: 35px 20px;
  border: 1px solid var(--th-border);
  border-radius: 15px;
  background: #fff;
  text-align: center;
}

.loading-panel strong {
  margin-top: 5px;
  color: var(--th-purple);
  font-family: 'Manrope', 'DM Sans', sans-serif;
  font-size: 14px;
  font-weight: 800;
}

.loading-panel span {
  color: var(--th-muted);
  font-size: 11px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 24px;
  border: 1px solid var(--th-border);
  border-radius: 16px;
  background: #fff;
  text-align: center;
}

.empty-icon {
  width: 58px;
  height: 58px;
  margin-bottom: 22px;
  border-radius: 17px;
  font-size: 22px;
}

.empty-state h2 {
  margin: 12px 0 8px;
  color: var(--th-purple);
  font-family: 'Manrope', 'DM Sans', sans-serif;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.6px;
}

.empty-state > p {
  max-width: 430px;
  margin: 0 0 22px;
  color: var(--th-muted);
  font-size: 12px;
  line-height: 1.9;
}

/* Footer */

.dashboard-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 54px;
  padding-top: 21px;
  border-top: 1px solid var(--th-border);
  color: #968b9f;
  font-size: 10px;
}

.footer-brand {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--th-purple);
  font-family: 'Manrope', 'DM Sans', sans-serif;
  font-size: 12px;
  font-weight: 800;
  text-decoration: none;
}

.footer-brand i {
  color: var(--th-purple-mid);
}

/* Responsive */

@media (min-width: 901px) {
  .mobile-create-button {
    display: none;
  }
}

@media (max-width: 1100px) {
  .th-dashboard {
    padding-right: 23px;
    padding-left: 23px;
  }

  .workspace-tab {
    padding-right: 12px;
    padding-left: 12px;
  }

  .header-context {
    display: none;
  }
}

@media (max-width: 760px) {
  .th-dashboard {
    padding-right: 17px;
    padding-left: 17px;
  }

  .dashboard-header {
    min-height: 73px;
    gap: 12px;
  }

  .brand-icon {
    width: 38px;
    height: 38px;
  }

  .brand-copy strong {
    font-size: 17px;
  }

  .brand-copy small {
    font-size: 7px;
  }

  .header-right {
    gap: 10px;
  }

  .header-divider {
    display: none;
  }

  .platform-admin-button {
    min-width: 0;
    padding: 0 10px !important;
    font-size: 10px;
  }

  .welcome-section {
    align-items: flex-start;
    padding: 32px 0 24px;
  }

  .welcome-copy h1 {
    font-size: 31px;
  }

  .welcome-actions {
    display: none;
  }

  .organisation-bar {
    align-items: flex-start;
    margin-bottom: 30px;
    padding: 15px;
  }

  .organisation-selector {
    width: 48%;
  }

  .section-heading h2 {
    font-size: 18px;
  }

  .overview-label {
    display: none;
  }

  .workspace-heading {
    align-items: flex-start;
    flex-direction: column;
    gap: 15px;
  }

  .workspace-actions {
    justify-content: flex-start;
    width: 100%;
  }

  .mobile-create-button {
    display: inline-flex;
  }

  .workspace-tabs {
    margin-right: -17px;
    border-right: 0;
    border-radius: 11px 0 0 11px;
  }

  .workspace-tab {
    min-height: 40px;
    padding: 0 13px;
  }

  .workspace-content {
    padding-top: 18px;
  }

  .subsection-card,
  .content-card {
    padding: 18px;
  }

  .dashboard-footer {
    align-items: flex-start;
    flex-direction: column;
    gap: 9px;
    margin-top: 38px;
  }
}

@media (max-width: 480px) {
  .th-dashboard {
    padding-right: 13px;
    padding-left: 13px;
  }

  .dashboard-header {
    min-height: 68px;
  }

  .brand-copy small {
    letter-spacing: 0.6px;
  }

  .header-right {
    gap: 7px;
  }

  .platform-admin-button {
    max-width: 40px;
    overflow: hidden;
    white-space: nowrap;
  }

  .welcome-section {
    padding-top: 28px;
  }

  .welcome-copy h1 {
    font-size: 29px;
  }

  .welcome-copy > p {
    max-width: 320px;
    font-size: 11px;
  }

  .organisation-bar {
    flex-direction: column;
    gap: 15px;
    padding: 15px;
  }

  .organisation-selector {
    width: 100%;
  }

  .organisation-identity {
    width: 100%;
  }

  .organisation-copy strong {
    max-width: 260px;
  }

  .stats-section {
    margin-bottom: 30px;
  }

  .section-heading h2 {
    font-size: 17px;
  }

  .workspace-tab {
    gap: 7px;
    padding: 0 11px;
    font-size: 10px;
  }

  .subsection-card,
  .content-card {
    padding: 15px;
    border-radius: 12px;
  }

  .subsection-heading,
  .content-card-heading {
    align-items: flex-start;
    gap: 10px;
  }

  .subsection-icon {
    width: 35px;
    height: 35px;
  }

  .empty-state {
    padding: 45px 18px;
  }

  .dashboard-footer {
    font-size: 9px;
  }
}
</style>
