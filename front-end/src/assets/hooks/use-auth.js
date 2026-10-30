import { useContext } from 'react';
import { authContext } from '@/components/use-context';


export const useAuth = () => {
    const { user } = useContext(authContext);
    return user;
};
