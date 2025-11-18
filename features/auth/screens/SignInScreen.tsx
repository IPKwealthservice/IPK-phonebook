// app/(auth)/sign-in.tsx

import { useRouter } from "expo-router";
import { Eye, EyeOff } from "lucide-react-native";
import { useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { toast } from "@/components/feedback/Toast";
import { Field } from "@/components/ui/Field";
import { LoginButton } from "@/components/ui/LoginButton";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/core/theme/ThemeProvider";
import { useAuthStore } from "@/features/auth/store/auth.store";

export const SignInScreen = () => {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= 840;

  const passwordRef = useRef<TextInput>(null);
  const { signIn, signingIn, error, hydrateUserFromGraphQL } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fetchingAfterLogin, setFetchingAfterLogin] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  const handleSubmit = async () => {
    Keyboard.dismiss();
    if (!email.trim() || !password) {
      toast("Enter email and password");
      return;
    }
    try {
      const success = await signIn({ email: email.trim(), password });
      if (!success) {
        toast("Incorrect email or password");
        return;
      }
      setFetchingAfterLogin(true);
      await hydrateUserFromGraphQL();
      toast("Signed in successfully");
      router.replace("/(tabs)");
    } catch (err) {
      console.error("SignIn error:", err);
      toast("Something went wrong");
    } finally {
      setFetchingAfterLogin(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 64}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, isTablet && styles.scrollWide]}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <Text style={styles.wordmark}>IPKwealth</Text>
            <Text size="xl" weight="bold" style={styles.title}>
              Sign In
            </Text>
            <Text tone="muted" style={styles.subtitle}>
              Access your IPK Wealth CRM from anywhere and follow up with leads
              instantly.
            </Text>
          </View>

          <View style={styles.form}>
            <Text tone="muted" size="xs" style={styles.formIntro}>
              Securely access your CRM and follow up with every lead instantly.
            </Text>
            <Field
              label="Work email"
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              style={styles.field}
            />

            <View style={styles.passwordWrapper}>
              <Field
                ref={passwordRef}
                label="Password"
                secureTextEntry={!isPasswordVisible}
                value={password}
                onChangeText={setPassword}
                onSubmitEditing={handleSubmit}
                returnKeyType="done"
                blurOnSubmit={true}
                error={error}
                style={styles.field}
              />

              <Pressable
                onPress={togglePasswordVisibility}
                style={styles.passwordToggle}
                accessibilityLabel={isPasswordVisible ? "Hide password" : "Show password"}
              >
                {isPasswordVisible ? (
                  <EyeOff size={20} color={theme.colors.text} />
                ) : (
                  <Eye size={20} color={theme.colors.text} />
                )}
              </Pressable>
            </View>

            <LoginButton
              label="Login"
              onPress={handleSubmit}
              loading={signingIn || fetchingAfterLogin}
              loadingText="Please wait..."
              style={styles.cta}
            />

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const makeStyles = (theme: ReturnType<typeof useTheme>) => {
  const s = theme.spacing ?? { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
  const r = theme.radii ?? { sm: 8, md: 12, lg: 16 };

  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      padding: s.lg,
    },
    scroll: {
      flexGrow: 1,
      justifyContent: "center",
      gap: s.xl,
    },
    scrollWide: {
      alignItems: "stretch",
    },
    hero: {
      alignItems: "center",
      gap: s.sm,
      marginBottom: s.lg,
    },
    wordmark: {
      fontSize: 42,
      fontWeight: "900",
      letterSpacing: 1.2,
      color: theme.colors.text,
    },
    title: {
      letterSpacing: 0.5,
    },
    subtitle: {
      textAlign: "center",
      paddingHorizontal: s.md,
    },
    formIntro: {
      textAlign: "center",
      paddingBottom: s.xs,
    },
    form: {
      gap: s.sm,
      width: "100%",
      maxWidth: 420,
      alignSelf: "center",
      backgroundColor: theme.scheme === "dark" ? "#0f172a" : "#f8fbff",
      borderWidth: 1,
      borderColor: theme.scheme === "dark" ? "rgba(255,255,255,0.08)" : "#E5E7EB",
      borderRadius: r.lg,
      padding: s.lg,
      shadowColor: "#0f172a",
      shadowOpacity: 0.12,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 10 },
      elevation: 6,
    },
    field: {
      height: 44,
      fontSize: 15,
      borderRadius: r.md,
    },
    passwordWrapper: {
      position: "relative",
    },
    cta: {
      alignSelf: "stretch",
      marginTop: s.sm,
    },
    passwordToggle: {
      position: "absolute",
      right: s.sm,
      top: 32,
      padding: 5,
      zIndex: 10,
    },
  });
};
