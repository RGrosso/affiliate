<template>
  <CoreContainer>
    <div class="flex items-center justify-center pt-20">
      <div class="w-full max-w-md">
        <h1 class="mb-2">Set up your account</h1>

        <template v-if="step === 'username'">
          <p class="mb-6 text-muted">Enter your username to get started.</p>

          <UForm
            ref="usernameForm"
            :schema="setupUsernameSchema"
            :state="state"
            class="space-y-4"
            @submit="checkUsername"
          >
            <UFormField
              label="Username"
              name="username"
            >
              <UInput
                v-model="state.username"
                class="w-full"
                autocomplete="username"
                autofocus
              />
            </UFormField>

            <UButton
              type="submit"
              class="cursor-pointer"
              trailing-icon="i-heroicons-arrow-right"
              :loading="pending"
            >
              Next
            </UButton>
          </UForm>
        </template>

        <template v-else>
          <p class="mb-6 text-muted">
            Choose a password for <span class="font-semibold">{{ state.username }}</span
            >. It needs at least {{ PASSWORD_MIN_LENGTH }} characters, with an uppercase letter, a lowercase letter, a number and a symbol.
          </p>

          <UForm
            ref="passwordForm"
            :schema="setupPasswordSchema"
            :state="state"
            class="space-y-4"
            @submit="savePassword"
          >
            <UFormField
              label="Password"
              name="password"
            >
              <UInput
                v-model="state.password"
                type="password"
                class="w-full"
                autocomplete="new-password"
                autofocus
              />
            </UFormField>

            <UFormField
              label="Confirm password"
              name="confirmPassword"
            >
              <UInput
                v-model="state.confirmPassword"
                type="password"
                class="w-full"
                autocomplete="new-password"
              />
            </UFormField>

            <div class="flex gap-2">
              <UButton
                color="neutral"
                variant="ghost"
                class="cursor-pointer"
                icon="i-heroicons-arrow-left"
                @click="step = 'username'"
              >
                Back
              </UButton>
              <UButton
                type="submit"
                class="cursor-pointer"
                :loading="pending"
              >
                Save password
              </UButton>
            </div>
          </UForm>
        </template>
      </div>
    </div>
  </CoreContainer>
</template>

<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";
import { PASSWORD_MIN_LENGTH, setupPasswordSchema, setupUsernameSchema, type SetupPasswordInput, type SetupUsernameInput } from "#shared/schemas/auth.schema";

definePageMeta({ hideFooter: true });

const { loggedIn, fetch, setupUsername, redirectAfterLogin } = useAuth();
const toast = useToast();
const usernameForm = useTemplateRef("usernameForm");
const passwordForm = useTemplateRef("passwordForm");
const pending = ref(false);

if (loggedIn.value) {
  await redirectAfterLogin();
}

// Coming from the login form, the server has already confirmed this user needs setup
const step = ref<"username" | "password">(setupUsername.value ? "password" : "username");

const state = reactive<Partial<SetupPasswordInput>>({
  username: setupUsername.value ?? undefined,
  password: undefined,
  confirmPassword: undefined,
});

async function checkUsername(event: FormSubmitEvent<SetupUsernameInput>) {
  pending.value = true;

  try {
    await $fetch("/api/auth/setup/check", { method: "POST", body: event.data });
    step.value = "password";
  } catch (err) {
    const error = getApiError(err);
    usernameForm.value?.setErrors(error.fieldErrors ? toFormErrors(error.fieldErrors) : [{ name: "username", message: error.message }]);
  } finally {
    pending.value = false;
  }
}

async function savePassword(event: FormSubmitEvent<SetupPasswordInput>) {
  pending.value = true;

  try {
    await $fetch("/api/auth/setup/password", { method: "POST", body: event.data });
    await fetch();
    setupUsername.value = null;

    toast.add({
      title: "You're all set",
      description: "Your password has been saved and you're now logged in.",
      color: "success",
    });

    await redirectAfterLogin();
  } catch (err) {
    const error = getApiError(err);

    if (error.code === "VALIDATION_ERROR") {
      passwordForm.value?.setErrors(toFormErrors(error.fieldErrors));
    } else {
      toast.add({ title: "Couldn't save your password", description: error.message, color: "error" });
    }
  } finally {
    pending.value = false;
  }
}
</script>
