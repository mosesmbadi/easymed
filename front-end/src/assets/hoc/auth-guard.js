import React,{ useEffect } from 'react'
import { useAuth } from '../hooks/use-auth';
import { useRouter } from 'next/router';


const AuthGuard = ({ children }) => {
    const user = useAuth();
    const router = useRouter();


    useEffect(() => {
        const initialize = async () => {
          if (!router.isReady) {
            // Wait for the router to be ready
            return;
          }
    
          if (!user) {
            // Redirect unauthenticated users to the login page
            await router.replace("/auth/login");
          }
        };
    
        initialize();
      }, [user, router]);

  return (
    <div>{children}</div>
  )
}


export default AuthGuard