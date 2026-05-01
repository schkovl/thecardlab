import React, { useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSSO } from "@clerk/expo";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";

WebBrowser.maybeCompleteAuthSession();

const useWarmUpBrowser = () => {
  useEffect(() => {
    if (Platform.OS !== "android") return;
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
};

type SSOStrategy = "oauth_google" | "oauth_apple" | "oauth_github";

interface ProviderConfig {
  strategy: SSOStrategy;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  bg: string;
  text: string;
  border: string;
}

const PROVIDERS: ProviderConfig[] = [
  {
    strategy: "oauth_google",
    label: "Continue with Google",
    icon: "globe",
    bg: "#ffffff",
    text: "#111827",
    border: "#e5e7eb",
  },
  {
    strategy: "oauth_apple",
    label: "Continue with Apple",
    icon: "smartphone",
    bg: "#000000",
    text: "#ffffff",
    border: "#374151",
  },
  {
    strategy: "oauth_github",
    label: "Continue with GitHub",
    icon: "github",
    bg: "#161b22",
    text: "#ffffff",
    border: "#30363d",
  },
];

export default function SignInScreen() {
  useWarmUpBrowser();
  const insets = useSafeAreaInsets();
  const { startSSOFlow } = useSSO();
  const router = useRouter();
  const [loadingStrategy, setLoadingStrategy] = React.useState<SSOStrategy | null>(null);

  const handleSSO = useCallback(
    async (strategy: SSOStrategy) => {
      if (loadingStrategy) return;
      setLoadingStrategy(strategy);
      try {
        const { createdSessionId, setActive } = await startSSOFlow({
          strategy,
          redirectUrl: AuthSession.makeRedirectUri(),
        });

        if (createdSessionId) {
          await setActive!({ session: createdSessionId });
          router.replace("/(tabs)");
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Authentication failed.";
        Alert.alert("Sign In Failed", msg);
      } finally {
        setLoadingStrategy(null);
      }
    },
    [startSSOFlow, loadingStrategy, router],
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom + 20 }]}>
      {/* Background glow */}
      <View style={styles.glow} pointerEvents="none" />

      {/* Logo + hero */}
      <View style={styles.heroSection}>
        <LinearGradient
          colors={["rgba(0,229,255,0.12)", "rgba(34,211,166,0.06)"]}
          style={styles.logoGlow}
        >
          <Feather name="layers" size={36} color="#00e5ff" />
        </LinearGradient>

        <Text style={styles.wordmark}>
          TheCard<Text style={{ color: "#00e5ff" }}>Lab</Text>
        </Text>

        <Text style={styles.tagline}>AI-Powered Sports Card Intelligence</Text>

        <View style={styles.badgeRow}>
          <Badge label="🏆 Top 1% Accuracy" />
          <Badge label="📈 1.2M Cards Analyzed" />
          <Badge label="⚡ Real-time Comps" />
        </View>
      </View>

      {/* Auth card */}
      <View style={styles.authCard}>
        <Text style={styles.authTitle}>Get Started</Text>
        <Text style={styles.authSub}>Sign in or create your account in seconds</Text>

        <View style={styles.buttons}>
          {PROVIDERS.map((p) => (
            <TouchableOpacity
              key={p.strategy}
              onPress={() => handleSSO(p.strategy)}
              disabled={loadingStrategy !== null}
              activeOpacity={0.85}
              style={[
                styles.providerBtn,
                { backgroundColor: p.bg, borderColor: p.border },
                loadingStrategy === p.strategy && { opacity: 0.7 },
              ]}
            >
              {loadingStrategy === p.strategy ? (
                <ActivityIndicator color={p.text} size="small" />
              ) : (
                <Feather name={p.icon} size={18} color={p.text} />
              )}
              <Text style={[styles.providerBtnText, { color: p.text }]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.legal}>
          By continuing, you agree to our Terms of Service and Privacy Policy.
          Your data is encrypted and never sold.
        </Text>
      </View>
    </View>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#050914",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  glow: {
    position: "absolute",
    top: -100,
    left: "50%",
    marginLeft: -200,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: "rgba(0,229,255,0.06)",
  },
  heroSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 20,
  },
  logoGlow: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,229,255,0.3)",
    marginBottom: 20,
    shadowColor: "#00e5ff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },
  wordmark: {
    fontSize: 40,
    fontWeight: "900",
    color: "#ffffff",
    letterSpacing: -1.5,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 15,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },
  badge: {
    backgroundColor: "rgba(0,229,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(0,229,255,0.2)",
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "600",
  },
  authCard: {
    backgroundColor: "#0d1a31",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(142,164,192,0.12)",
    padding: 24,
    marginBottom: 12,
  },
  authTitle: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  authSub: {
    color: "#64748b",
    fontSize: 13,
    marginBottom: 20,
  },
  buttons: {
    gap: 12,
  },
  providerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  providerBtnText: {
    fontSize: 15,
    fontWeight: "700",
  },
  legal: {
    color: "#334155",
    fontSize: 11,
    textAlign: "center",
    marginTop: 16,
    lineHeight: 16,
  },
});
