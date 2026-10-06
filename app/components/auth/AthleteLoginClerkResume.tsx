import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { useAppDispatch } from "@/store/hooks";
import { getAthleteToken } from "@/lib/api";
import { resumeClerkAthleteSession } from "@/utils/clerkAthleteSync";
import {
  clearAthleteIntentionalLogout,
  shouldSkipClerkAthleteResume,
} from "@/utils/athleteSessionLogout";

interface AthleteLoginClerkResumeProps {
  postLoginPath: string;
}

/** Resume Atleita session when Clerk is already signed in (ClerkLoaded only). */
export default function AthleteLoginClerkResume({
  postLoginPath,
}: AthleteLoginClerkResumeProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoaded: clerkLoaded, isSignedIn, getToken } = useAuth();
  const clerkResumeAttemptedRef = useRef(false);

  useEffect(() => {
    const intentionalLogout = shouldSkipClerkAthleteResume();
    if (
      !clerkLoaded ||
      !isSignedIn ||
      getAthleteToken() ||
      clerkResumeAttemptedRef.current ||
      intentionalLogout
    ) {
      if (intentionalLogout) {
        clearAthleteIntentionalLogout();
        clerkResumeAttemptedRef.current = true;
      }
      return;
    }
    clerkResumeAttemptedRef.current = true;
    void resumeClerkAthleteSession({ dispatch, getToken }).then((resumed) => {
      if (resumed.ok) {
        const claimParams = new URLSearchParams(location.search);
        const claimToken = claimParams.get("claimToken")?.trim();
        navigate(
          claimToken
            ? `/portal/registrations?claimToken=${encodeURIComponent(claimToken)}`
            : resumed.path,
          { replace: true },
        );
      }
    });
  }, [clerkLoaded, dispatch, getToken, isSignedIn, navigate, location.search]);

  return null;
}
