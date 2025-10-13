import { fetchLogin } from '@/api/auth';
import { User } from '@/types/User';
import { setToken, setUserInStorage } from '@/utils/token';
import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import toast from 'react-hot-toast';
import { Role } from './ContextTypes';

interface AuthContextType {
  user: User | null;
  selectedRole: Role | null;
  setSelectedRole: (role: Role) => void;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<User | null>;
  logout: () => void;
  error: string | null;
  isLoading: boolean;
  updateUserInContext: (updatedUser: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedRole, setSelectedRoleState] = useState<Role | null>(null);

  const setSelectedRole = (role: Role) => {
    sessionStorage.setItem('selected_role', JSON.stringify(role) || '');
    setSelectedRoleState(role);
  };
  const updateUserInContext = (updatedUser: User) => {
    setUser(updatedUser);
    sessionStorage.setItem('user', JSON.stringify(updatedUser));
  };
  // ✅ Combined: Auth check + Role restoration + Role defaulting
  useEffect(() => {
    const checkAuth = () => {
      const token = sessionStorage.getItem('auth_token');
      const storedUser = sessionStorage.getItem('user');
      const storedRole = sessionStorage.getItem('selected_role');
      if (token && storedUser) {
        try {
          const userData = JSON.parse(storedUser) as User;
          setUser(userData);
          setIsAuthenticated(true);

          // Restore role from storage if valid
          if (userData.accessList?.length > 0) {
            if (storedRole && userData.accessList.includes(storedRole)) {
              setSelectedRoleState(JSON.parse(storedRole));
            } else {
              // Default to second role if multiple, else first
              const fallbackRole =
                userData.accessList.length >= 2
                  ? userData.accessList[1]
                  : userData.accessList[0];

              setSelectedRole(fallbackRole);
            }
          }
        } catch (err) {
          sessionStorage.removeItem('auth_token');
          sessionStorage.removeItem('user');
          sessionStorage.removeItem('selected_role');
          setUser(null);
          setIsAuthenticated(false);
        }
      }
      setLoading(false);
    };

    checkAuth();
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, []);

  const login = async (userName: string, password: string) => {
    try {
      setError(null);

      const { token, user } = await fetchLogin(userName, password);
      if (user) {
        setToken(token);
        setUserInStorage(user);
        setUser(user);
        setIsAuthenticated(true);

        // Set initial selected role
        if (user.accessList?.length > 0) {
          const defaultRole =
            user.accessList.length >= 2
              ? user.accessList[1]
              : user.accessList[0];
          setSelectedRole(defaultRole);
        }

        toast.success(`Welcome back, ${user.UserName}!`);
        return user;
      } else {
        return null;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  };

  const logout = () => {
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('selected_role');
    setUser(null);
    setSelectedRoleState(null);
    setIsAuthenticated(false);
    toast.success('Logged out successfully');
  };
  return (
    <AuthContext.Provider
      value={{
        user,
        selectedRole,
        setSelectedRole,
        isAuthenticated,
        login,
        logout,
        error,
        isLoading: loading,
        updateUserInContext,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
