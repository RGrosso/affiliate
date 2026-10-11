<template>
  <UContainer>
    <div
      v-if="user"
      class="flex items-center justify-center pt-20"
    >
      <div class="text-center space-y-4">
        <p class="text-xl text-muted">
          You are logged in as <span class="font-semibold">{{ user.username }}</span>
        </p>
        <UButton
          color="secondary"
          variant="soft"
          class="cursor-pointer"
          @click="logout"
        >
          Logout
        </UButton>
      </div>
    </div>
    <div
      v-else
      class="flex items-center justify-center pt-20"
    >
      <div class="w-full max-w-md">
        <h1 class="mb-6">
          Login
        </h1>
        <UForm
          ref="form"
          :schema="loginSchema"
          :state="state"
          class="space-y-4"
          @submit="onSubmit"
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

          <UFormField
            label="Password"
            name="password"
          >
            <UInput
              v-model="state.password"
              type="password"
              class="w-full"
              autocomplete="current-password"
            />
          </UFormField>

          <UButton
            type="submit"
            class="cursor-pointer"
            :loading="pending"
          >
            {{ pending ? 'Logging in...' : 'Login' }}
          </UButton>
        </UForm>
      </div>
    </div>
  </UContainer>
</template>

<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";
import { loginSchema, type LoginInput } from "#shared/schemas/auth.schema";

const { user, fetch, logout, setupUsername, redirectAfterLogin } = useAuth();
const toast = useToast();
const form = useTemplateRef("form");
const pending = ref(false);

// Nobody has a password yet, so there's nothing to log in to: go straight to setup
const { data: status } = await useFetch("/api/auth/status");
if (!user.value && status.value?.data.hasAccounts === false) {
  await navigateTo("/setup");
}

const state = reactive<Partial<LoginInput>>({
  username: undefined,
  password: undefined,
});

async function onSubmit(event: FormSubmitEvent<LoginInput>) {
  pending.value = true;

  try {
    await $fetch("/api/auth/login", { method: "POST", body: event.data });
    await fetch();

    toast.add({
      title: "Success",
      description: "Logged in successfully!",
      color: "success",
    });

    await redirectAfterLogin();
  } catch (err) {
    const error = getApiError(err);

    switch (error.code) {
      case "SETUP_REQUIRED":
        setupUsername.value = event.data.username;
        await navigateTo("/setup");
        break;
      case "VALIDATION_ERROR":
        form.value?.setErrors(toFormErrors(error.fieldErrors));
        break;
      case "INVALID_CREDENTIALS":
      case "ACCOUNT_DISABLED":
        form.value?.setErrors([{ name: "password", message: error.message }]);
        break;
      default:
        toast.add({ title: "Login failed", description: error.message, color: "error" });
    }
  } finally {
    pending.value = false;
  }
}
</script>
