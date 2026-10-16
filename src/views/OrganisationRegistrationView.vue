<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { organisationOnboardingService } from '@/services/organisationOnboardingService'
import type { OrganisationApplicationPayload } from '@/types/organisationOnboarding'

const initialForm = (): OrganisationApplicationPayload => ({
  organisation_name: '',
  organisation_description: '',
  contact_email: '',
  contact_phone: '',
  owner_name: '',
  owner_email: '',
  website: '',
})

const form = reactive<OrganisationApplicationPayload>(initialForm())
const submitting = ref(false)
const submitted = ref(false)
const errorMessage = ref('')
const applicationReference = ref('')
const fieldErrors = reactive<Record<string, string>>({})

const organisationNameLength = computed(() => form.organisation_name.trim().length)

function validate(): boolean {
  Object.keys(fieldErrors).forEach((key) => delete fieldErrors[key])
  errorMessage.value = ''

  if (organisationNameLength.value < 2) {
    fieldErrors.organisation_name = 'Enter an organisation name with at least 2 characters.'
  }
  if (form.owner_name.trim().length < 2) {
    fieldErrors.owner_name = 'Enter the full name of the organisation owner.'
  }
  if (!isValidEmail(form.owner_email)) {
    fieldErrors.owner_email = 'Enter a valid owner email address.'
  }
  if (!isValidEmail(form.contact_email)) {
    fieldErrors.contact_email = 'Enter a valid organisation contact email.'
  }
  if (form.contact_phone.trim().length > 40) {
    fieldErrors.contact_phone = 'Phone number must be 40 characters or fewer.'
  }
  if (form.organisation_description.trim().length > 3000) {
    fieldErrors.organisation_description = 'Description must be 3,000 characters or fewer.'
  }

  return Object.keys(fieldErrors).length === 0
}

function isValidEmail(value: string): boolean {
  return value.trim().length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

function getErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    const candidate = error as {
      response?: { data?: { error?: string; message?: string } }
      message?: string
    }
    return candidate.response?.data?.error
      || candidate.response?.data?.message
      || candidate.message
      || 'We could not submit your application. Please try again.'
  }
  return 'We could not submit your application. Please try again.'
}

async function submitApplication() {
  if (submitting.value || !validate()) return

  submitting.value = true
  errorMessage.value = ''

  try {
    const payload: OrganisationApplicationPayload = {
      organisation_name: form.organisation_name.trim(),
      organisation_description: form.organisation_description.trim(),
      contact_email: form.contact_email.trim().toLowerCase(),
      contact_phone: form.contact_phone.trim(),
      owner_name: form.owner_name.trim(),
      owner_email: form.owner_email.trim().toLowerCase(),
      website: form.website, // Honeypot; never show it to normal users.
    }

    const response = await organisationOnboardingService.submit(payload)
    submitted.value = true
    applicationReference.value = response.application?.id ?? ''
  } catch (error) {
    errorMessage.value = getErrorMessage(error)
  } finally {
    submitting.value = false
  }
}

function startAnotherApplication() {
  Object.assign(form, initialForm())
  Object.keys(fieldErrors).forEach((key) => delete fieldErrors[key])
  applicationReference.value = ''
  submitted.value = false
  errorMessage.value = ''
}
</script>

<template>
  <div class="org-page">
    <header class="site-header">
      <div class="header-inner">
        <a class="brand" href="/" aria-label="TrainHub home">
          <span class="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M4 7.2 12 3l8 4.2v9.4L12 21l-8-4.4V7.2Z" stroke="currentColor" stroke-width="1.5" />
              <path d="m8 9 4-2.1L16 9l-4 2.2L8 9Z" fill="#F7C948" />
              <path d="M9 12.1v3.2l3 1.6 3-1.6v-3.2" stroke="#F7C948" stroke-width="1.5" />
            </svg>
          </span>
          <span>TrainHub</span>
        </a>

        <nav class="main-nav" aria-label="Main navigation">
          <a href="/trainings">Trainings</a>
          <a href="/#how-it-works">How it works</a>
          <a href="/organisations" aria-current="page">Organisations</a>
          <a href="/#faq">FAQ</a>
        </nav>

        <div class="header-actions">
          <a class="login-link" href="/login">Log in</a>
          <a class="header-cta" href="#application-form">Register your organisation</a>
        </div>
        <a class="mobile-cta" href="#application-form">Register organisation</a>
      </div>
    </header>

    <main>
      <section class="hero">
        <div class="hero-copy">
          <span class="eyebrow"><span class="eyebrow-dot" /> FOR TRAINING PROVIDERS</span>
          <h1>Bring your training programmes to <span>TrainHub.</span></h1>
          <p class="hero-description">
            Create a home for your organisation, publish professional training programmes,
            and manage registrations and payments in one place.
          </p>
          <div class="hero-points">
            <div><span class="check-icon">✓</span> Publish and manage training</div>
            <div><span class="check-icon">✓</span> Reach individual and corporate learners</div>
            <div><span class="check-icon">✓</span> Keep registrations and payments organised</div>
          </div>
          <a class="text-link" href="#how-it-works">How organisation registration works <span aria-hidden="true">→</span></a>
        </div>

        <div class="hero-visual" aria-label="Illustration of the TrainHub organisation workspace">
          <div class="visual-topline">
            <span class="live-dot" /> <span>Organisation workspace</span>
            <span class="visual-tag">TRAINHUB</span>
          </div>
          <div class="workspace-card">
            <div class="workspace-heading">
              <div class="workspace-logo">NX</div>
              <div class="workspace-title">
                <strong>NGX X-Academy</strong>
                <span>Organisation dashboard</span>
              </div>
              <span class="active-pill">Active</span>
            </div>
            <div class="workspace-stats">
              <div class="mini-stat">
                <span class="stat-icon purple-icon">▤</span>
                <span class="mini-label">Trainings</span>
                <strong>24</strong>
                <small>Programmes published</small>
              </div>
              <div class="mini-stat">
                <span class="stat-icon gold-icon">♙</span>
                <span class="mini-label">Participants</span>
                <strong>680</strong>
                <small>Learners registered</small>
              </div>
            </div>
            <div class="upcoming-title"><strong>Upcoming trainings</strong><span>View all</span></div>
            <div class="training-row">
              <div class="training-date"><strong>07</strong><span>OCT</span></div>
              <div class="training-info"><strong>Investment &amp; Portfolio Management</strong><span>Virtual · 2 days</span></div>
              <span class="row-arrow">↗</span>
            </div>
            <div class="training-row">
              <div class="training-date date-lilac"><strong>14</strong><span>OCT</span></div>
              <div class="training-info"><strong>Leadership Essentials</strong><span>Hybrid · 1 day</span></div>
              <span class="row-arrow">↗</span>
            </div>
          </div>
          <div class="floating-note"><span class="floating-check">✓</span><span><strong>Everything in one place</strong><small>Trainings, registrations and payments</small></span></div>
          <span class="decor decor-one" />
          <span class="decor decor-two" />
        </div>
      </section>

      <section class="benefit-strip" aria-label="Platform benefits">
        <div class="benefit-inner">
          <div class="benefit-item"><span class="benefit-icon">⌁</span><div><strong>One workspace</strong><span>Manage your programmes</span></div></div>
          <div class="benefit-item"><span class="benefit-icon">◎</span><div><strong>Wider reach</strong><span>Connect with learners</span></div></div>
          <div class="benefit-item"><span class="benefit-icon">₦</span><div><strong>Simpler payments</strong><span>Keep payments organised</span></div></div>
          <div class="benefit-item"><span class="benefit-icon">↗</span><div><strong>Built to grow</strong><span>Support your next programme</span></div></div>
        </div>
      </section>

      <section id="how-it-works" class="process-section">
        <div class="section-heading">
          <span class="eyebrow">GET STARTED</span>
          <h2>From application to your own workspace</h2>
          <p>A straightforward process to bring your organisation onto TrainHub.</p>
        </div>
        <div class="process-grid">
          <article class="process-card"><span class="step-number">01</span><span class="process-icon">↗</span><h3>Tell us about your organisation</h3><p>Share your organisation details and the contact information for its owner.</p></article>
          <article class="process-card"><span class="step-number">02</span><span class="process-icon">✓</span><h3>We review your application</h3><p>Our team reviews your submission before creating an organisation workspace.</p></article>
          <article class="process-card"><span class="step-number">03</span><span class="process-icon">⌂</span><h3>Set up your workspace</h3><p>Once approved, the organisation owner receives an invitation to get started.</p></article>
        </div>
      </section>

      <section id="application-form" class="application-section">
        <div class="application-intro">
          <span class="eyebrow"><span class="eyebrow-dot" /> ORGANISATION ONBOARDING</span>
          <h2>Register your organisation</h2>
          <p>Complete the form and submit your application for review. Fields marked with an asterisk are required.</p>
          <div class="review-note">
            <span class="review-note-icon">i</span>
            <div><strong>What happens next?</strong><p>Your application will be reviewed by the TrainHub team. If approved, we'll send an invitation to the organisation owner's email address.</p></div>
          </div>
          <div class="privacy-note"><span aria-hidden="true">♧</span> Your details are used to process your organisation application.</div>
        </div>

        <div class="form-shell">
          <div v-if="submitted" class="success-state" role="status" aria-live="polite">
            <div class="success-mark"><svg viewBox="0 0 24 24" fill="none"><path d="m5 12.5 4.2 4.2L19 7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" /></svg></div>
            <span class="success-eyebrow">APPLICATION SUBMITTED</span>
            <h3>Thanks for choosing TrainHub.</h3>
            <p>Your organisation application has been received and is awaiting review. We'll use the contact details you provided if we need to follow up.</p>
            <div v-if="applicationReference" class="reference-box"><span>Application reference</span><strong>{{ applicationReference }}</strong></div>
            <button class="secondary-button full-button" type="button" @click="startAnotherApplication">Submit another application</button>
          </div>

          <form v-else class="application-form" novalidate @submit.prevent="submitApplication">
            <div class="form-heading"><span class="form-step">APPLICATION FORM</span><span class="required-hint">* Required fields</span></div>
            <div v-if="errorMessage" class="form-alert" role="alert"><span aria-hidden="true">!</span><p>{{ errorMessage }}</p></div>

            <fieldset class="form-fieldset">
              <legend><span class="legend-number">1</span> Organisation details</legend>
              <div class="field-grid">
                <div class="field field-full">
                  <label for="organisation-name">Organisation name <span>*</span></label>
                  <input id="organisation-name" v-model="form.organisation_name" type="text" autocomplete="organization" maxlength="160" placeholder="e.g. NGX X-Academy" :aria-invalid="Boolean(fieldErrors.organisation_name)" :aria-describedby="fieldErrors.organisation_name ? 'organisation-name-error' : undefined" required />
                  <small v-if="fieldErrors.organisation_name" id="organisation-name-error" class="field-error">{{ fieldErrors.organisation_name }}</small>
                </div>
                <div class="field field-full">
                  <label for="organisation-description">About your organisation <span class="optional">(optional)</span></label>
                  <textarea id="organisation-description" v-model="form.organisation_description" rows="4" maxlength="3000" placeholder="Tell us about your organisation and the training programmes you provide." :aria-invalid="Boolean(fieldErrors.organisation_description)" />
                  <div class="field-meta"><small v-if="fieldErrors.organisation_description" class="field-error">{{ fieldErrors.organisation_description }}</small><small v-else>Briefly describe your organisation and its focus.</small><small>{{ form.organisation_description.length }}/3000</small></div>
                </div>
                <div class="field">
                  <label for="contact-email">Organisation contact email <span>*</span></label>
                  <input id="contact-email" v-model="form.contact_email" type="email" autocomplete="email" maxlength="254" placeholder="info@organisation.com" :aria-invalid="Boolean(fieldErrors.contact_email)" :aria-describedby="fieldErrors.contact_email ? 'contact-email-error' : undefined" required />
                  <small v-if="fieldErrors.contact_email" id="contact-email-error" class="field-error">{{ fieldErrors.contact_email }}</small>
                </div>
                <div class="field">
                  <label for="contact-phone">Contact phone <span class="optional">(optional)</span></label>
                  <input id="contact-phone" v-model="form.contact_phone" type="tel" autocomplete="tel" maxlength="40" placeholder="e.g. +234 800 000 0000" :aria-invalid="Boolean(fieldErrors.contact_phone)" :aria-describedby="fieldErrors.contact_phone ? 'contact-phone-error' : undefined" />
                  <small v-if="fieldErrors.contact_phone" id="contact-phone-error" class="field-error">{{ fieldErrors.contact_phone }}</small>
                </div>
              </div>
            </fieldset>

            <fieldset class="form-fieldset owner-fieldset">
              <legend><span class="legend-number">2</span> Organisation owner</legend>
              <p class="fieldset-description">Who should receive the invitation to manage this organisation?</p>
              <div class="field-grid">
                <div class="field field-full">
                  <label for="owner-name">Owner's full name <span>*</span></label>
                  <input id="owner-name" v-model="form.owner_name" type="text" autocomplete="name" maxlength="160" placeholder="Enter full name" :aria-invalid="Boolean(fieldErrors.owner_name)" :aria-describedby="fieldErrors.owner_name ? 'owner-name-error' : undefined" required />
                  <small v-if="fieldErrors.owner_name" id="owner-name-error" class="field-error">{{ fieldErrors.owner_name }}</small>
                </div>
                <div class="field field-full">
                  <label for="owner-email">Owner's email address <span>*</span></label>
                  <input id="owner-email" v-model="form.owner_email" type="email" autocomplete="email" maxlength="254" placeholder="owner@organisation.com" :aria-invalid="Boolean(fieldErrors.owner_email)" :aria-describedby="fieldErrors.owner_email ? 'owner-email-error' : 'owner-email-help'" required />
                  <small v-if="fieldErrors.owner_email" id="owner-email-error" class="field-error">{{ fieldErrors.owner_email }}</small>
                  <small v-else id="owner-email-help">Use an email address the owner can access. We'll send the workspace invitation here after approval.</small>
                </div>
              </div>
            </fieldset>

            <!-- Honeypot: hidden from people, but left in the DOM for basic bot filtering. -->
            <div class="honeypot" aria-hidden="true"><label for="website">Website</label><input id="website" v-model="form.website" type="text" tabindex="-1" autocomplete="off" /></div>

            <div class="form-footer">
              <p>By submitting, you confirm that the details provided are accurate and may be used to review this application.</p>
              <button class="primary-button submit-button" type="submit" :disabled="submitting">
                <span v-if="submitting" class="spinner" aria-hidden="true" />
                {{ submitting ? 'Submitting application…' : 'Submit application' }}
                <span v-if="!submitting" aria-hidden="true">→</span>
              </button>
              <span class="secure-caption"><span aria-hidden="true">▣</span> Your application is sent securely to TrainHub.</span>
            </div>
          </form>
        </div>
      </section>

      <section class="bottom-cta">
        <div><span class="eyebrow">READY TO GET STARTED?</span><h2>Make your next training programme count.</h2><p>Bring your organisation and your learners together with TrainHub.</p></div>
        <a href="#application-form" class="light-button">Register your organisation <span aria-hidden="true">→</span></a>
      </section>
    </main>

    <footer class="site-footer">
      <a class="brand footer-brand" href="/" aria-label="TrainHub home"><span class="brand-mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M4 7.2 12 3l8 4.2v9.4L12 21l-8-4.4V7.2Z" stroke="currentColor" stroke-width="1.5"/><path d="m8 9 4-2.1L16 9l-4 2.2L8 9Z" fill="#F7C948"/><path d="M9 12.1v3.2l3 1.6 3-1.6v-3.2" stroke="#F7C948" stroke-width="1.5"/></svg></span><span>TrainHub</span></a>
      <span>Professional training, connected.</span>
      <div class="footer-links"><a href="/trainings">Trainings</a><a href="/organisations">Organisations</a><a href="/login">Log in</a></div>
      <small>© {{ new Date().getFullYear() }} TrainHub. All rights reserved.</small>
    </footer>
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap');

:root { --th-purple: #29143d; --th-purple-2: #432465; --th-purple-3: #6b4a88; --th-ink: #111014; --th-muted: #81758f; --th-border: #e7e1ec; --th-lilac: #f7f3fb; --th-gold: #f7c948; --th-green: #19875a; }
.org-page { min-height: 100vh; background: #fff; color: var(--th-ink); font-family: 'DM Sans', sans-serif; font-size: 14px; -webkit-font-smoothing: antialiased; }
.org-page * { box-sizing: border-box; }
.org-page a { color: inherit; text-decoration: none; }
.site-header { height: 68px; border-bottom: 1px solid #eee9f0; background: rgba(255,255,255,.96); }
.header-inner { max-width: 1248px; height: 100%; padding: 0 30px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 30px; }
.brand { display: inline-flex; align-items: center; gap: 9px; flex-shrink: 0; color: #17121c; font-family: 'Manrope', sans-serif; font-weight: 800; font-size: 16px; letter-spacing: -.5px; }
.brand-mark { display: grid; place-items: center; width: 31px; height: 31px; border-radius: 9px; background: var(--th-purple); color: white; }
.brand-mark svg { width: 22px; height: 22px; }
.main-nav, .header-actions { display: flex; align-items: center; gap: 28px; }
.main-nav a, .login-link { color: #7a6d87; font-size: 12px; transition: color .2s; }
.main-nav a:hover, .main-nav a[aria-current='page'], .login-link:hover { color: var(--th-purple); }
.header-cta { padding: 12px 18px; background: var(--th-purple); color: white !important; border-radius: 30px; font-size: 11px; font-weight: 700; white-space: nowrap; transition: background .2s, transform .2s; }
.header-cta:hover, .primary-button:hover:not(:disabled) { background: #43225f; transform: translateY(-1px); }
.mobile-cta { display: none; }
.hero { max-width: 1248px; min-height: 510px; margin: 0 auto; padding: 74px 30px 76px; display: grid; grid-template-columns: .94fr 1.06fr; gap: 78px; align-items: center; }
.hero-copy { max-width: 510px; padding-bottom: 8px; }
.eyebrow { display: inline-flex; align-items: center; gap: 8px; color: var(--th-purple-3); font-size: 10px; line-height: 1.5; font-weight: 700; letter-spacing: 1.1px; }
.eyebrow-dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: var(--th-gold); }
h1, h2, h3, p { margin-top: 0; }
.hero h1 { max-width: 540px; margin: 17px 0 18px; font-family: 'Manrope', sans-serif; font-size: clamp(36px, 4.15vw, 53px); line-height: 1.1; letter-spacing: -2.5px; font-weight: 800; }
.hero h1 span { color: var(--th-purple-2); }
.hero-description { max-width: 430px; margin-bottom: 21px; color: var(--th-muted); font-size: 14px; line-height: 1.85; }
.hero-points { display: grid; gap: 11px; margin-bottom: 24px; color: #4f4659; font-size: 12px; }
.hero-points > div { display: flex; align-items: center; gap: 9px; }
.check-icon { width: 18px; height: 18px; border-radius: 50%; display: grid; place-items: center; color: var(--th-green); background: #e9f7ef; font-size: 11px; font-weight: 800; }
.text-link { display: inline-flex; gap: 8px; align-items: center; color: var(--th-purple-2) !important; font-size: 12px; font-weight: 700; }
.text-link span { font-size: 17px; transition: transform .2s; }
.text-link:hover span { transform: translateX(3px); }
.hero-visual { position: relative; width: 100%; max-width: 520px; min-height: 385px; padding: 22px 23px 24px; border-radius: 25px; background: linear-gradient(135deg, #251039, #45266a 72%, #382051); box-shadow: 0 20px 50px rgba(43,19,62,.13); isolation: isolate; }
.visual-topline { display: flex; align-items: center; gap: 8px; color: #fff; font-size: 10px; font-weight: 600; margin-bottom: 17px; }
.live-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--th-gold); }
.visual-tag { margin-left: auto; color: #c9b8da; font-size: 9px; letter-spacing: .8px; }
.workspace-card { position: relative; z-index: 1; padding: 19px; border-radius: 15px; background: #fff; box-shadow: 0 10px 30px rgba(12,4,20,.1); }
.workspace-heading { display: flex; align-items: center; gap: 11px; padding-bottom: 18px; border-bottom: 1px solid #eee9f0; }
.workspace-logo { width: 36px; height: 36px; border-radius: 11px; display: grid; place-items: center; background: #f0e9f7; color: var(--th-purple); font-family: 'Manrope', sans-serif; font-size: 11px; font-weight: 800; }
.workspace-title { display: grid; gap: 3px; min-width: 0; }
.workspace-title strong { font-size: 12px; }
.workspace-title span { color: #8d8297; font-size: 10px; }
.active-pill { margin-left: auto; border-radius: 20px; padding: 5px 9px; background: #e5f7ed; color: #188252; font-size: 9px; font-weight: 700; }
.workspace-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 11px; padding: 16px 0 18px; }
.mini-stat { position: relative; min-height: 95px; display: grid; align-content: start; padding: 12px; border: 1px solid #eee9f2; border-radius: 10px; }
.stat-icon { position: absolute; top: 11px; right: 11px; width: 25px; height: 25px; display: grid; place-items: center; border-radius: 8px; font-size: 15px; }
.purple-icon { color: #68418b; background: #f1eafa; }
.gold-icon { color: #9b6a00; background: #fff5d7; }
.mini-label { color: #8c8098; font-size: 9px; }
.mini-stat strong { margin-top: 7px; font-family: 'Manrope', sans-serif; font-size: 22px; letter-spacing: -.7px; }
.mini-stat small { margin-top: 2px; color: #988da1; font-size: 8px; }
.upcoming-title { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 10px; }
.upcoming-title span { color: var(--th-purple-3); font-size: 9px; font-weight: 700; }
.training-row { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-top: 1px solid #f1edf3; }
.training-date { width: 35px; height: 39px; display: grid; align-content: center; justify-items: center; gap: 1px; flex-shrink: 0; border-radius: 8px; color: var(--th-purple); background: #f0e8f8; }
.training-date strong { font-size: 13px; line-height: 1.1; }
.training-date span { font-size: 7px; font-weight: 800; letter-spacing: .6px; }
.date-lilac { background: #f6f0e2; color: #8e6818; }
.training-info { min-width: 0; flex: 1; display: grid; gap: 4px; }
.training-info strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 9px; }
.training-info span { color: #91869c; font-size: 8px; }
.row-arrow { color: #9b8eaa; font-size: 14px; }
.floating-note { position: absolute; z-index: 2; right: -25px; bottom: -22px; display: flex; align-items: center; gap: 10px; padding: 13px 16px; background: white; border: 1px solid #eee8f1; border-radius: 12px; box-shadow: 0 10px 28px rgba(32,15,47,.12); }
.floating-check { width: 27px; height: 27px; display: grid; place-items: center; border-radius: 50%; background: #e4f7ec; color: #138350; font-weight: 800; }
.floating-note > span:last-child { display: grid; gap: 4px; }
.floating-note strong { font-size: 10px; }
.floating-note small { color: #8e8397; font-size: 9px; }
.decor { position: absolute; z-index: -1; display: block; border: 1px solid rgba(255,255,255,.16); border-radius: 50%; }
.decor-one { width: 125px; height: 125px; top: -36px; right: 35px; }
.decor-two { width: 78px; height: 78px; bottom: -20px; left: -28px; }
.benefit-strip { background: #f8f5fb; border-top: 1px solid #eee6f4; border-bottom: 1px solid #eee6f4; }
.benefit-inner { max-width: 1120px; min-height: 112px; margin: 0 auto; padding: 23px 30px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 22px; align-items: center; }
.benefit-item { display: flex; align-items: center; gap: 12px; }
.benefit-icon { width: 39px; height: 39px; display: grid; place-items: center; flex-shrink: 0; border-radius: 12px; background: #fff; color: var(--th-purple-2); font-size: 20px; box-shadow: 0 3px 12px rgba(48,25,66,.04); }
.benefit-item > div { display: grid; gap: 5px; }
.benefit-item strong { font-size: 12px; }
.benefit-item div span { color: #8a7d96; font-size: 10px; }
.process-section { padding: 87px 30px 91px; max-width: 1248px; margin: 0 auto; }
.section-heading { text-align: center; max-width: 570px; margin: 0 auto 37px; }
.section-heading h2, .application-intro h2, .bottom-cta h2 { font-family: 'Manrope', sans-serif; font-weight: 800; letter-spacing: -1.2px; }
.section-heading h2 { margin: 12px 0 10px; font-size: 31px; line-height: 1.25; }
.section-heading p { margin-bottom: 0; color: var(--th-muted); font-size: 12px; line-height: 1.7; }
.process-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
.process-card { position: relative; min-height: 200px; padding: 25px 24px; border: 1px solid #eee8f2; border-radius: 15px; background: #fff; transition: transform .2s, box-shadow .2s; }
.process-card:hover { transform: translateY(-3px); box-shadow: 0 12px 28px rgba(37,16,54,.06); }
.step-number { position: absolute; top: 20px; right: 21px; color: #c6b9d1; font-family: 'Manrope', sans-serif; font-size: 13px; font-weight: 800; }
.process-icon { width: 42px; height: 42px; display: grid; place-items: center; margin-bottom: 22px; border-radius: 12px; background: #f3edf9; color: var(--th-purple-2); font-size: 19px; }
.process-card h3 { margin-bottom: 9px; font-family: 'Manrope', sans-serif; font-size: 15px; letter-spacing: -.3px; }
.process-card p { max-width: 300px; margin-bottom: 0; color: var(--th-muted); font-size: 11px; line-height: 1.8; }
.application-section { padding: 82px 30px 90px; background: #faf8fc; border-top: 1px solid #f0eaf4; border-bottom: 1px solid #f0eaf4; display: grid; grid-template-columns: minmax(250px, .72fr) minmax(0, 1.1fr); gap: clamp(45px, 7vw, 100px); align-items: start; }
.application-intro { max-width: 410px; justify-self: end; padding-top: 15px; }
.application-intro h2 { margin: 17px 0 14px; font-size: 36px; line-height: 1.17; }
.application-intro > p { color: var(--th-muted); font-size: 13px; line-height: 1.85; }
.review-note { display: flex; gap: 12px; margin-top: 28px; padding: 17px; border: 1px solid #e9e0f0; border-radius: 12px; background: #fff; }
.review-note-icon { width: 24px; height: 24px; flex-shrink: 0; display: grid; place-items: center; border-radius: 50%; background: #f0e7f8; color: var(--th-purple-2); font-family: serif; font-weight: 700; }
.review-note strong { font-size: 12px; }
.review-note p { margin: 6px 0 0; color: var(--th-muted); font-size: 11px; line-height: 1.75; }
.privacy-note { display: flex; gap: 8px; align-items: center; margin-top: 20px; color: #8a7c95; font-size: 10px; }
.privacy-note span { font-size: 16px; }
.form-shell { width: 100%; max-width: 650px; padding: 29px 30px 28px; border: 1px solid #eae3ef; border-radius: 17px; background: #fff; box-shadow: 0 14px 38px rgba(44,21,62,.045); }
.application-form { width: 100%; }
.form-heading { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding-bottom: 18px; border-bottom: 1px solid #eee9f1; }
.form-step { color: var(--th-purple-2); font-size: 10px; font-weight: 800; letter-spacing: .9px; }
.required-hint { color: #96899f; font-size: 10px; }
.form-alert { display: flex; align-items: flex-start; gap: 10px; margin-top: 18px; padding: 12px 13px; border: 1px solid #f0d2d2; border-radius: 9px; background: #fff7f7; color: #a32e38; }
.form-alert > span { width: 19px; height: 19px; display: grid; place-items: center; flex-shrink: 0; border-radius: 50%; background: #ffe6e6; font-weight: 800; }
.form-alert p { margin: 1px 0 0; font-size: 11px; line-height: 1.6; }
.form-fieldset { min-width: 0; margin: 0; padding: 22px 0 23px; border: 0; border-bottom: 1px solid #eee9f1; }
.form-fieldset legend { display: flex; align-items: center; gap: 10px; width: 100%; padding: 0; font-family: 'Manrope', sans-serif; font-size: 14px; font-weight: 800; letter-spacing: -.2px; }
.legend-number { width: 25px; height: 25px; display: grid; place-items: center; border-radius: 8px; background: #f2eafa; color: var(--th-purple-2); font-family: 'DM Sans', sans-serif; font-size: 11px; }
.field-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px 15px; margin-top: 19px; }
.field { display: flex; min-width: 0; flex-direction: column; gap: 8px; }
.field-full { grid-column: 1 / -1; }
.field label { color: #30263a; font-size: 11px; font-weight: 700; }
.field label > span:not(.optional) { color: #b53d54; }
.field label .optional { color: #a095aa; font-weight: 400; }
.field input, .field textarea { width: 100%; min-width: 0; padding: 12px 13px; border: 1px solid #e4dce9; border-radius: 8px; outline: none; background: #fff; color: #21172b; font: inherit; font-size: 12px; line-height: 1.5; transition: border-color .2s, box-shadow .2s; }
.field input { height: 43px; }
.field textarea { min-height: 100px; resize: vertical; }
.field input::placeholder, .field textarea::placeholder { color: #b0a6b8; }
.field input:focus, .field textarea:focus { border-color: #8a67a6; box-shadow: 0 0 0 3px rgba(100,62,133,.1); }
.field input[aria-invalid='true'], .field textarea[aria-invalid='true'] { border-color: #c84b58; }
.field > small, .field-meta { color: #998da3; font-size: 10px; line-height: 1.55; }
.field-error { color: #b52d3b !important; }
.field-meta { display: flex; justify-content: space-between; gap: 10px; }
.fieldset-description { margin: 10px 0 0 35px; color: #8c8096; font-size: 11px; line-height: 1.6; }
.owner-fieldset { padding-bottom: 24px; }
.form-footer { padding-top: 19px; }
.form-footer > p { margin-bottom: 15px; color: #8e8298; font-size: 10px; line-height: 1.7; }
.primary-button, .secondary-button, .light-button { min-height: 45px; display: inline-flex; align-items: center; justify-content: center; gap: 10px; padding: 12px 18px; border: 0; border-radius: 8px; font: inherit; font-size: 12px; font-weight: 700; cursor: pointer; transition: background .2s, transform .2s, border-color .2s; }
.primary-button { background: var(--th-purple); color: #fff; }
.primary-button:disabled { cursor: wait; opacity: .7; }
.submit-button { width: 100%; }
.submit-button > span:last-child { font-size: 17px; }
.secure-caption { display: flex; justify-content: center; align-items: center; gap: 6px; margin-top: 13px; color: #9a8fa3; font-size: 9px; }
.secure-caption span { color: #6b5b7b; }
.spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,.45); border-top-color: #fff; border-radius: 50%; animation: th-spin .7s linear infinite; }
@keyframes th-spin { to { transform: rotate(360deg); } }
.honeypot { position: absolute !important; width: 1px !important; height: 1px !important; padding: 0 !important; margin: -1px !important; overflow: hidden !important; clip: rect(0, 0, 0, 0) !important; white-space: nowrap !important; border: 0 !important; }
.success-state { padding: 35px 5px 18px; text-align: center; }
.success-mark { width: 58px; height: 58px; display: grid; place-items: center; margin: 0 auto 19px; border-radius: 50%; background: #e6f7ed; color: #168451; }
.success-mark svg { width: 29px; height: 29px; }
.success-eyebrow { color: #168451; font-size: 9px; font-weight: 800; letter-spacing: 1px; }
.success-state h3 { margin: 12px 0 10px; font-family: 'Manrope', sans-serif; font-size: 24px; letter-spacing: -.8px; }
.success-state > p { max-width: 420px; margin: 0 auto 20px; color: var(--th-muted); font-size: 12px; line-height: 1.8; }
.reference-box { display: grid; gap: 5px; margin: 0 auto 22px; padding: 13px; border: 1px dashed #dcd0e6; border-radius: 9px; background: #faf7fc; }
.reference-box span { color: #8e8298; font-size: 10px; }
.reference-box strong { overflow-wrap: anywhere; color: var(--th-purple); font-size: 12px; }
.full-button { width: 100%; margin-top: 9px; }
.secondary-button { border: 1px solid #e5dce9; background: #fff; color: var(--th-purple); }
.secondary-button:hover { background: #faf7fc; }
.bottom-cta { padding: 47px 30px; display: flex; justify-content: space-between; align-items: center; gap: 30px; background: var(--th-purple); color: #fff; }
.bottom-cta > div { width: 100%; max-width: 790px; margin: 0 auto; }
.bottom-cta .eyebrow { color: #d4c2e6; }
.bottom-cta h2 { margin: 10px 0 8px; font-size: 26px; }
.bottom-cta p { margin-bottom: 0; color: #c9b9d8; font-size: 12px; }
.light-button { flex-shrink: 0; margin-right: max(calc((100vw - 1188px) / 2), 0px); background: #fff; color: var(--th-purple); }
.light-button:hover { background: #f5eef9; }
.site-footer { max-width: 1248px; margin: 0 auto; padding: 27px 30px 22px; display: flex; align-items: center; gap: 18px; color: #91859b; font-size: 10px; }
.footer-brand { color: #201629; font-size: 13px; }
.footer-brand .brand-mark { width: 27px; height: 27px; }
.site-footer > span { margin-right: auto; }
.footer-links { display: flex; gap: 18px; }
.footer-links a:hover { color: var(--th-purple); }
.site-footer > small { width: 100%; text-align: right; }

@media (max-width: 1000px) {
  .header-inner { gap: 20px; padding: 0 24px; }
  .main-nav { gap: 17px; }
  .header-actions { gap: 15px; }
  .hero { gap: 45px; padding-right: 25px; padding-left: 25px; }
  .hero-visual { padding: 20px; }
  .floating-note { right: -12px; }
  .application-section { gap: 40px; padding-right: 24px; padding-left: 24px; }
  .form-shell { padding: 25px 23px; }
  .site-footer { flex-wrap: wrap; }
  .site-footer > small { width: auto; margin-left: auto; }
}
@media (max-width: 760px) {
  .site-header { height: 62px; }
  .header-inner { padding: 0 19px; gap: 12px; }
  .main-nav, .header-actions { display: none; }
  .mobile-cta { display: inline-flex; align-items: center; justify-content: center; padding: 10px 13px; border-radius: 30px; background: var(--th-purple); color: #fff !important; font-size: 10px; font-weight: 700; white-space: nowrap; }
  .hero { min-height: unset; grid-template-columns: 1fr; gap: 42px; padding: 58px 21px 65px; }
  .hero-copy { max-width: 560px; }
  .hero h1 { max-width: 550px; font-size: clamp(38px, 8.6vw, 54px); letter-spacing: -1.8px; }
  .hero-description { font-size: 13px; }
  .hero-visual { justify-self: center; max-width: 520px; }
  .floating-note { right: 10px; }
  .benefit-inner { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 22px 15px; padding: 25px 22px; }
  .benefit-item { gap: 10px; }
  .benefit-icon { width: 34px; height: 34px; border-radius: 10px; }
  .benefit-item strong { font-size: 11px; }
  .benefit-item div span { font-size: 9px; }
  .process-section { padding: 64px 21px; }
  .section-heading { margin-bottom: 28px; }
  .section-heading h2 { font-size: 27px; }
  .process-grid { grid-template-columns: 1fr; gap: 12px; }
  .process-card { min-height: unset; padding: 20px; }
  .process-icon { margin-bottom: 14px; }
  .application-section { grid-template-columns: 1fr; gap: 30px; padding: 59px 20px 65px; }
  .application-intro { max-width: 600px; justify-self: stretch; padding-top: 0; }
  .application-intro h2 { font-size: 32px; }
  .review-note { margin-top: 21px; }
  .form-shell { max-width: 600px; justify-self: center; padding: 24px 21px; }
  .bottom-cta { padding: 39px 22px; flex-direction: column; align-items: flex-start; gap: 22px; }
  .bottom-cta > div { margin: 0; }
  .bottom-cta h2 { font-size: 24px; }
  .light-button { margin: 0; }
  .site-footer { padding: 25px 21px; gap: 15px; }
  .site-footer > span { display: none; }
  .footer-links { margin-left: auto; }
  .site-footer > small { width: 100%; margin: 0; text-align: left; }
}
@media (max-width: 480px) {
  .brand { font-size: 15px; }
  .mobile-cta { font-size: 9px; padding: 10px 11px; }
  .hero { padding-top: 47px; }
  .hero h1 { font-size: 39px; }
  .hero-visual { min-height: unset; padding: 16px 13px 19px; border-radius: 20px; }
  .workspace-card { padding: 13px; }
  .workspace-stats { gap: 7px; }
  .mini-stat { padding: 9px; }
  .mini-stat strong { font-size: 20px; }
  .floating-note { right: 7px; bottom: -23px; padding: 10px 12px; }
  .floating-note small { font-size: 8px; }
  .benefit-inner { gap: 19px 9px; padding-right: 16px; padding-left: 16px; }
  .benefit-item { align-items: flex-start; gap: 8px; }
  .benefit-icon { width: 29px; height: 29px; font-size: 16px; }
  .benefit-item strong { font-size: 10px; }
  .benefit-item div span { font-size: 8px; }
  .form-shell { padding: 21px 15px; border-radius: 13px; }
  .form-heading { align-items: flex-start; }
  .form-fieldset legend { font-size: 13px; }
  .field-grid { grid-template-columns: 1fr; gap: 15px; }
  .field-full { grid-column: auto; }
  .field input { height: 45px; }
  .fieldset-description { margin-left: 0; }
  .footer-links { gap: 12px; font-size: 9px; }
}
@media (prefers-reduced-motion: reduce) {
  .org-page *, .org-page *::before, .org-page *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; scroll-behavior: auto !important; transition-duration: .01ms !important; }
}
</style>
