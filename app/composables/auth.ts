export function useAuth() {
  const session = useUserSession();
  const toast = useToast();
  const route = useRoute();

  /** Username carried from the login form to /setup when an account still needs a password. */
  const setupUsername = useState<string | null>("setup-username", () => null);

  const isAdmin = computed(() => session.user.value?.role === "admin");

  function redirectAfterLogin() {
    return navigateTo(isAdmin.value ? "/admin" : "/");
  }

  async function logout() {
    await $fetch("/api/auth/logout", { method: "POST" });
    await session.fetch();

    toast.add({
      title: "Logged out",
      description: "You have been logged out",
      color: "primary",
    });

    if (route.path.startsWith("/admin")) {
      await navigateTo("/login");
    }
  }

  return {
    ...session,
    isAdmin,
    setupUsername,
    redirectAfterLogin,
    logout,
  };
}
