import { useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import {
  setClerkTokenFunction
} from "../services/clerkToken";

export function ClerkTokenProvider({
  children
}) {
  const { getToken } = useAuth();

  useEffect(() => {

    setClerkTokenFunction(async () => {
      return await getToken({ skipCache: true });
    });

    return () => {
      setClerkTokenFunction(null);
    };

  }, [getToken]);

  return children;
}