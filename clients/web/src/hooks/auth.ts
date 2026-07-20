import { usePostHog } from "@/hooks/posthog";
import { AuthContext } from "@/providers/auth";
import { api } from "@/utils/client";
import { schemas, unwrap } from "@/lib/api";
import { getSentryClient } from "@/lib/monitoring/sentry-client";
import { useContext, useEffect, useRef } from "react";

export const useAuth = (): {
  authenticated: boolean;
  currentUser: schemas["UserRead"] | undefined;
  reloadUser: () => Promise<undefined>;
  userOrganizations: schemas["Organization"][];
  setUserOrganizations: React.Dispatch<
    React.SetStateAction<schemas["Organization"][]>
  >;
} => {
  const posthog = usePostHog();
  const {
    user: currentUser,
    setUser: setCurrentUser,
    userOrganizations,
    setUserOrganizations,
  } = useContext(AuthContext);

  const reloadUser = async (): Promise<undefined> => {
    const user = await unwrap(api.GET("/v1/users/me"));
    setCurrentUser(user);
  };

  const sentryUserSet = useRef(false);

  useEffect(() => {
    let active = true;

    if (currentUser) {
      posthog.identify(currentUser);
      void getSentryClient().then((Sentry) => {
        if (!active || !Sentry) return;
        Sentry.setUser({
          id: currentUser.id,
          email: currentUser.email,
        });
        sentryUserSet.current = true;
      });
    } else if (sentryUserSet.current) {
      void getSentryClient().then((Sentry) => {
        if (!active || !Sentry) return;
        Sentry.setUser(null);
        sentryUserSet.current = false;
      });
    }

    return () => {
      active = false;
    };
  }, [currentUser, posthog]);

  return {
    currentUser,
    authenticated: currentUser !== undefined,
    reloadUser,
    userOrganizations,
    setUserOrganizations,
  };
};
