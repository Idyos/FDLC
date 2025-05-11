import { z } from "zod";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { createUserWithEmailAndPassword, getAuth } from "firebase/auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const registerSchema = z
  .object({
    email: z.string().email("Format del correu electrònic incorrecte"),
    password: z.string().min(6, "La contrassenya ha de tenir almenys 6 caràcters"),
    repeatPassword: z.string(),
  })
  .refine((data) => data.password === data.repeatPassword, {
    path: ["repeatPassword"],
    message: "Les contrasenyes no coincideixen",
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

type LoginFormProps = {
    auth: ReturnType<typeof getAuth>;
    setIsLogin: React.Dispatch<React.SetStateAction<boolean>>;
    onClick: () => void;
  };

export default function ({ auth, setIsLogin, onClick }: LoginFormProps) {
    const form = useForm<RegisterFormValues>({
        resolver: zodResolver(registerSchema),
    });

    const onTryRegister = (data: RegisterFormValues) => {
        createUserWithEmailAndPassword(auth, data.email, data.password)
        .then((userCredential) => { 
          console.log("Usuari creat:", userCredential.user);
            onClick();  
        })
        .catch((error) => {
            const errorCode = error.code;
            const errorMessage = error.message;
            console.log("Error:", errorCode, errorMessage); 
        });
        console.log("Datos enviados:", data);
    };

    return(
        <div className="max-w-sm mx-auto mt-10 border-1 rounded-2xl shadow-lg p-6 bg-white dark:bg-gray-800">
      <Form {...form}>
        <form className="space-y-4" onSubmit={form.handleSubmit(onTryRegister)}>
            <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                    <Input type="email" placeholder="admin@example.com" {...field} />
                    </FormControl>
                    <FormMessage /> {/* Aquí se muestran errores */}
                </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Contrassenya</FormLabel>
                    <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage /> {/* Aquí se muestran errores */}
                </FormItem>
                )}
            />
            <FormField
            control={form.control}
            name="repeatPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Repetir contrassenya</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="••••••••" {...field} />
                </FormControl>
                <FormMessage /> {/* Aquí se muestran errores */}
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full">Crear Compte</Button>
          <Button variant={"outline"} className="w-full" onClick={() => setIsLogin(true)}>Iniciar sessió</Button>
        </form>
      </Form>
    </div>
    );
}