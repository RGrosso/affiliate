<template>
  <UContainer>
    <div
      v-if="user"
      class="flex items-center justify-center min-h-screen"
    >
      <div class="text-center space-y-4">
        <h1 class="text-3xl font-bold">
          Welcome!
        </h1>
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
      class="flex items-center justify-center min-h-screen"
    >
      <div class="w-full max-w-md">
        <h1 class="text-2xl font-bold mb-6">
          Login
        </h1>
        <UForm
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
            />
          </UFormField>

          <UFormField
            label="Password"
            name="password"
            :error="loginError ?? undefined"
          >
            <UInput
              v-model="state.password"
              type="password"
              class="w-full"
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
import type * as z from "zod";
import type { FetchError } from "ofetch";
import { loginSchema } from "@@/schemas/auth.schema";
import type { LoginErrorData } from "@@/type/auth";

type Schema = z.output<typeof loginSchema>;

const userSession = useUserSession();
const user = userSession.user;
const toast = useToast();
const pending = ref(false);

const state = reactive<Partial<Schema>>({
  username: undefined,
  password: undefined
});

const loginError = ref<string | null>(null);

async function onSubmit() {
  pending.value = true;
  loginError.value = null;
  try {
    await $fetch("/api/auth/login", {
      method: "POST",
      body: state
    });

    toast.add({
      title: "Success",
      description: "Logged in successfully!",
      color: "success"
    });

    await userSession.fetch();
  } catch (err) {
    const error = err as FetchError<LoginErrorData>;

    if (error.data?.code && error.data?.message) {
      loginError.value = error.data.message;

      if (error.data.code === "INVALID_FORMAT") {
        toast.add({
          title: "Validation Error",
          description: error.data.message,
          color: "error"
        });
      }
    } else {
      toast.add({
        title: "Error",
        description: error.statusMessage || "Login failed",
        color: "error"
      });
    }
  } finally {
    pending.value = false;
  }
}

async function logout() {
  await $fetch("/api/auth/logout", {
    method: "POST"
  });

  await userSession.fetch();

  toast.add({
    title: "Logged out",
    description: "You have been logged out",
    color: "primary"
  });
}
</script>
