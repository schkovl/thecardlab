import colors from "@/constants/colors";

// TheCardLab is dark-only
export function useColors() {
  return { ...colors.dark, radius: colors.radius };
}
