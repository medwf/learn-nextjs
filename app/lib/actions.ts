"use server";
import { z } from "zod";
import postgres from "postgres";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const sql = postgres(process.env.POSTGRES_URL!, { ssl: "require" });

const FormSchema = z.object({
  id: z.string({ invalid_type_error: "Please select a customer." }),
  customerId: z.string(),
  amount: z.coerce
    .number()
    .gt(0, { message: "Please enter an amount greater than 0$" }),
  status: z.enum(["pending", "paid"], {
    invalid_type_error: "Please select an invoice status.",
  }),
  date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });
export type State = {
  message: string | null;
  errors: {
    customerId?: string[];
    amount?: string[];
    state?: string[];
  };
};

export async function createInvoice(prevState: State, data: FormData) {
  const validatedFields = CreateInvoice.safeParse({
    customerId: data.get("customerId"),
    amount: data.get("amount"),
    status: data.get("status"),
  });
  // console.log(validatedFields.error);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Missing Fields. Failed to Create Invoice",
    };
  }

  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;
  const date = new Date().toISOString().split("T")[0];

  try {
    await sql`
      insert into invoices (customer_id, amount, status, date)
      values ( ${customerId}, ${amountInCents}, ${status}, ${date})
    `;
  } catch (error) {
    console.log(error);
    return { message: "Database Error: Failed to Create Invoice." };
  }

  revalidatePath("/dashboard/invoices");
  redirect("/dashboard/invoices");
}

// Use Zod to update the expected types
const UpdateInvoice = FormSchema.omit({ id: true, date: true });

// ...

export async function updateInvoice(
  id: string,
  prevState: State,
  formData: FormData
) {
  const validatedFields = UpdateInvoice.safeParse({
    customerId: formData.get("customerId"),
    amount: formData.get("amount"),
    status: formData.get("status"),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Missing Fields. Failed to Create Invoice",
    };
  }

  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;

  try {
    await sql`
      UPDATE invoices
      SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
      WHERE id = ${id}
    `;
  } catch (error) {
    console.log(error);
    return { message: "Database Error: Failed to Update Invoice." };
  }

  revalidatePath("/dashboard/invoices");
  redirect("/dashboard/invoices");
}

export async function deleteInvoice(id: string) {
  throw new Error("Failed to Delete Invoice.");

  await sql`DELETE FROM invoices WHERE id = ${id}`;
  revalidatePath("/dashboard/invoices");
}
