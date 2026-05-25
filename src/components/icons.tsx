import { TrendingUp } from "lucide-react";

const GoogleIcon = (props: React.ComponentProps<"svg">) => (
  <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      fill="currentColor"
      d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.02 1.02-2.62 1.62-4.55 1.62-3.83 0-6.94-2.82-6.94-6.32s3.11-6.32 6.94-6.32c2.1 0 3.54.82 4.4 1.68l2.52-2.34C17.66 2.52 15.34 1.5 12.48 1.5c-5.45 0-9.94 4.13-9.94 9.12s4.49 9.12 9.94 9.12c5.18 0 9.4-3.2 9.4-9.32 0-.57-.05-1.05-.12-1.52H12.48z"
    />
  </svg>
);

export const Icons = {
  logo: TrendingUp,
  google: GoogleIcon,
};
