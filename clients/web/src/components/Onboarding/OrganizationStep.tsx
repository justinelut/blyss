"use client";

import revalidate from "@/app/actions";
import { useAuth, useOAuthAccounts, useOnboardingTracking } from "@/hooks";
import { inferSignupMethod } from "@/hooks/onboarding";
import { usePostHog } from "@/hooks/posthog";
import { useCreateOrganization } from "@/hooks/queries";
import { useCreatorCategories } from "@/hooks/queries/creators";
import { api } from "@/utils/client";
import { setValidationErrors } from "@/utils/api/errors";
import { CONFIG } from "@/utils/config";
import { schemas } from "@/lib/api";
import Button from "@/components/atoms/Button";
import Input from "@/components/atoms/Input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/Select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import slugify from "slugify";
import { FadeUp } from "../Animated/FadeUp";
import LogoIcon from "../Brand/logos/LogoIcon";
import { CurrencySelector } from "../CurrencySelector";
import { getStatusRedirect } from "../Toast/utils";
import SupportedUseCases from "./components/SupportedUseCases";

export interface OrganizationStepProps {
  slug?: string;
  validationErrors?: schemas["ValidationError"][];
  error?: string;
  hasExistingOrg: boolean;
}

type FormSchema = Pick<
  schemas["OrganizationCreate"],
  "name" | "slug" | "default_presentment_currency"
> & {
  terms: boolean;
};

export const OrganizationStep = ({
  slug: initialSlug,
  validationErrors,
  error,
  hasExistingOrg,
}: OrganizationStepProps) => {
  const posthog = usePostHog();
  const { currentUser, setUserOrganizations } = useAuth();
  const oauthAccounts = useOAuthAccounts();
  const {
    startOnboarding,
    trackStepStarted,
    trackStepCompleted,
    experimentVariant,
  } = useOnboardingTracking();

  const form = useForm<FormSchema>({
    defaultValues: {
      name: initialSlug || "",
      slug: initialSlug || "",
      default_presentment_currency: "kes",
      terms: false,
    },
  });

  const {
    control,
    handleSubmit,
    watch,
    setError,
    clearErrors,
    setValue,
    formState: { errors },
  } = form;
  const createOrganization = useCreateOrganization();
  const { data: creatorCategories = [] } = useCreatorCategories();
  const [selectedCategory, setSelectedCategory] = useState("");
  const [editedSlug, setEditedSlug] = useState(false);

  const router = useRouter();

  useEffect(() => {
    posthog.capture("dashboard:organizations:create:view");

    if (!hasExistingOrg) {
      const signupMethod = inferSignupMethod(oauthAccounts);
      startOnboarding(signupMethod);
      trackStepStarted("org");
    }
  }, [
    hasExistingOrg,
    oauthAccounts,
    posthog,
    startOnboarding,
    trackStepStarted,
  ]);

  useEffect(() => {
    if (validationErrors) {
      setValidationErrors(validationErrors, setError);
    }
    if (error) {
      setError("root", { message: error });
    } else {
      clearErrors("root");
    }
  }, [validationErrors, error, setError, clearErrors]);

  const { name, slug, terms } = useWatch({
    control,
  });

  useEffect(() => {
    if (!editedSlug && name) {
      setValue("slug", slugify(name, { lower: true, strict: true }));
    } else if (slug) {
      setValue(
        "slug",
        slugify(slug, { lower: true, trim: false, strict: true }),
      );
    }
  }, [name, editedSlug, slug, setValue]);

  const onSubmit = async (data: FormSchema) => {
    if (!data.terms) return;

    const params = {
      ...data,
      slug: slug as string,
    };
    posthog.capture("dashboard:organizations:create:submit", params);
    const { data: organization, error } =
      await createOrganization.mutateAsync(params);

    if (error) {
      if (error.detail) {
        setValidationErrors(error.detail, setError);
      }
      return;
    }

    await revalidate(`organizations:${organization.slug}`, { expire: 0 });
    await revalidate(`users:${currentUser?.id}:organizations`, {
      expire: 0,
    });
    setUserOrganizations((orgs) => [...orgs, organization]);

    // Persist the chosen creator category (best-effort; non-blocking).
    if (selectedCategory) {
      try {
        await (api as any).PATCH("/v1/organizations/{id}/profile", {
          params: { path: { id: organization.id } },
          body: { creator_category: selectedCategory },
        });
      } catch {
        /* category can also be set later in settings */
      }
    }

    if (!hasExistingOrg) {
      trackStepCompleted("org", organization.id);
    }

    let queryParams = "";
    if (hasExistingOrg) {
      queryParams = "?existing_org=true";
    }

    router.push(
      getStatusRedirect(
        `/dashboard/${organization.slug}/onboarding/product${queryParams}`,
        "Shop created",
        "You can now create your first product",
      ),
    );
  };

  return (
    <div className="dark:md:bg-polar-950 flex flex-col pt-16 md:items-center md:p-16">
      <motion.div
        initial="hidden"
        animate="visible"
        transition={{ duration: 1, staggerChildren: 0.3 }}
        className="flex min-h-0 w-full shrink-0 flex-col gap-12 md:max-w-xl md:p-8"
      >
        <FadeUp className="flex flex-col items-center gap-y-8">
          <LogoIcon size={48} />
          <div className="flex flex-col items-center gap-y-4">
            <h1 className="text-3xl">
              {hasExistingOrg ? "Add another shop" : "Let's get you started"}
            </h1>
            <p className="dark:text-polar-400 text-lg text-gray-600">
              {hasExistingOrg ? (
                "Choose the shop name and address buyers will see"
              ) : (
                <>You&rsquo;ll be up and running in no time</>
              )}
            </p>
          </div>
        </FadeUp>

        <div className="flex flex-col gap-12">
          <Form {...form}>
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="flex w-full flex-col gap-y-8"
            >
              <div className="flex flex-col gap-y-8">
                <FadeUp className="dark:bg-polar-900 flex flex-col gap-y-4 rounded-3xl border-gray-200 bg-white p-6 md:border dark:border-none">
                  <FormField
                    control={control}
                    name="name"
                    rules={{
                      required: "This field is required",
                    }}
                    render={({ field }) => (
                      <FormItem className="w-full">
                        <FormLabel htmlFor="name">Shop name</FormLabel>
                        <FormControl className="flex w-full flex-col gap-y-4">
                          <Input {...field} placeholder="Amina Studio" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={control}
                    name="slug"
                    rules={{
                      required: "Slug is required",
                    }}
                    render={({ field }) => (
                      <FormItem className="w-full">
                        <FormLabel htmlFor="slug">Shop address</FormLabel>
                        <FormControl className="flex w-full flex-col gap-y-4">
                          <Input
                            type="text"
                            {...field}
                            size={slug?.length || 1}
                            placeholder="amina-studio"
                            onFocus={() => setEditedSlug(true)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </FadeUp>

                <FadeUp className="dark:bg-polar-900 flex flex-col gap-y-4 rounded-3xl border-gray-200 bg-white p-6 md:border dark:border-none">
                  <FormField
                    control={control}
                    name="default_presentment_currency"
                    rules={{
                      required: "Currency is required",
                    }}
                    render={({ field }) => (
                      <FormItem className="w-full">
                        <FormLabel htmlFor="default_presentment_currency">
                          Default payment currency
                        </FormLabel>
                        <FormControl className="flex w-full flex-col gap-y-4">
                          <CurrencySelector
                            value={
                              field.value as schemas["PresentmentCurrency"]
                            }
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                        <FormDescription>
                          The default currency for your products
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                </FadeUp>

                {creatorCategories.length > 0 && (
                  <FadeUp className="dark:bg-polar-900 flex flex-col gap-y-4 rounded-3xl border-gray-200 bg-white p-6 md:border dark:border-none">
                    <div className="flex flex-col gap-y-2">
                      <label
                        htmlFor="creator_category"
                        className="text-sm font-medium"
                      >
                        Category
                      </label>
                      <Select
                        value={selectedCategory || "__none__"}
                        onValueChange={(v) =>
                          setSelectedCategory(v === "__none__" ? "" : v)
                        }
                      >
                        <SelectTrigger id="creator_category">
                          <SelectValue placeholder="Choose a category (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">
                            Choose a category (optional)
                          </SelectItem>
                          {creatorCategories.map((c) => (
                            <SelectItem key={c.id} value={c.slug}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-[var(--text-muted)]">
                        Helps buyers discover you on the creators directory. You
                        can change this later in settings.
                      </p>
                    </div>
                  </FadeUp>
                )}

                <FadeUp className="dark:bg-polar-900 flex flex-col gap-y-4 rounded-3xl border-gray-200 bg-white p-6 md:border dark:border-none">
                  <SupportedUseCases />
                </FadeUp>

                <FadeUp className="dark:bg-polar-900 flex flex-col gap-y-4 rounded-3xl border-gray-200 bg-white p-6 md:border dark:border-none">
                  <FormField
                    control={control}
                    name="terms"
                    rules={{
                      required: "You must accept the terms to continue",
                    }}
                    render={({ field }) => {
                      return (
                        <FormItem>
                          <div className="flex flex-row items-start gap-x-3">
                            <Checkbox
                              id="terms"
                              checked={field.value}
                              onCheckedChange={(checked) => {
                                const value = checked ? true : false;
                                setValue("terms", value);
                              }}
                              className="mt-1"
                            />
                            <div className="flex flex-col gap-y-2 text-sm">
                              <label
                                htmlFor="terms"
                                className="cursor-pointer leading-relaxed font-medium"
                              >
                                I&apos;ve read what Blyss allows and agree to
                                the platform terms
                              </label>
                              <ul className="flex flex-col gap-y-1 text-sm text-[var(--text-muted)]">
                                <li>
                                  <a
                                    href="/acceptable-use"
                                    className="text-[var(--accent)] hover:underline"
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    Acceptable Use Policy
                                  </a>
                                  {" — "}what creators can and can&apos;t sell
                                  on Blyss
                                </li>
                                <li>
                                  <a
                                    href="/terms"
                                    className="text-[var(--accent)] hover:underline"
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    Terms of Service
                                  </a>
                                </li>
                                <li>
                                  <a
                                    href="/privacy"
                                    className="text-[var(--accent)] hover:underline"
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    Privacy Policy
                                  </a>
                                </li>
                              </ul>
                            </div>
                          </div>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                </FadeUp>
              </div>
              {errors.root && (
                <p className="text-destructive-foreground text-sm">
                  {errors.root.message}
                </p>
              )}
              <FadeUp className="flex flex-col gap-y-3">
                <Button
                  type="submit"
                  loading={createOrganization.isPending}
                  disabled={
                    !name ||
                    !slug ||
                    name.length < 3 ||
                    slug.length < 3 ||
                    !terms
                  }
                >
                  {experimentVariant === "treatment" ? "Continue" : "Create"}
                </Button>
                {hasExistingOrg ? (
                  <Link href={`/dashboard`} className="w-full">
                    <Button variant="secondary" fullWidth>
                      Back to Dashboard
                    </Button>
                  </Link>
                ) : (
                  <Link
                    href={`${CONFIG.BASE_URL}/v1/auth/logout`}
                    prefetch={false}
                    className="w-full"
                  >
                    <Button variant="secondary" fullWidth>
                      Logout
                    </Button>
                  </Link>
                )}
              </FadeUp>
            </form>
          </Form>
        </div>
      </motion.div>
    </div>
  );
};
