"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { LocationCombobox } from "@/components/ui/location-combobox";
import {
  venueStep1Schema,
  venueStep2Schema,
  venueStep3Schema,
  type CreateVenueInput,
} from "@/lib/validation/venues.schema";
import { useCreateVenue, useUpdateVenue, useCheckVenueDuplicate } from "@/lib/hooks/use-venues";
import type { VenueWithCreator } from "@/lib/data-access/venues.dal";
import { AddressAutocomplete } from "./AddressAutocomplete";
import { VenueMapSelector } from "./VenueMapSelector";
import { VenueFloorPlansUpload } from "./VenueFloorPlansUpload";
import { VenueMediaUpload } from "./VenueMediaUpload";
import { getCountryCoordinates } from "@/lib/utils/country-coordinates";
import { useCountries } from "@/lib/hooks/use-locations";
import { MAX_TEXTAREA_LENGTH } from "@/lib/validation/venues.schema";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Loader2, Home, User, CreditCard, ChevronRight, Save, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useVenueTemplates, useVenueTemplate } from "@/lib/hooks/use-venues";
import { SaveVenueTemplateDialog } from "./SaveVenueTemplateDialog";
import { UseVenueTemplateDialog } from "./UseVenueTemplateDialog";
import { useProfile } from "@/lib/hooks/use-profile";
import { OtpVerificationDialog } from "@/components/verification/OtpVerificationDialog";

interface VenueFormProps {
  mode: "create" | "edit";
  venue?: VenueWithCreator;
  defaultCountry: string;
  defaultCountryId?: string;
}

type VenueFormData = CreateVenueInput;

/** Normalize legacy string[] or mixed shape to { url, name }[] */
function normalizeFloorPlans(
  raw: (string | { url: string; name?: string })[] | null | undefined
): { url: string; name?: string }[] {
  if (!raw || !Array.isArray(raw)) return [];
  return raw.map((item) => (typeof item === "string" ? { url: item } : { url: item.url, name: item.name }));
}

// Step indicator component matching the image style (horizontal, no borders)
function StepIndicator({
  currentStep,
  totalSteps: _unusedTotalSteps,
  onStepClick,
  stepErrors,
}: {
  currentStep: number;
  totalSteps: number;
  onStepClick?: (step: number) => void;
  stepErrors?: Record<number, boolean>;
}) {
  // totalSteps is part of the interface but not currently used
  void _unusedTotalSteps;
  const steps = [
    { number: 1, title: "Basic Information", subtitle: "Venue Details", icon: Home },
    { number: 2, title: "Capacity & Features", subtitle: "Specifications", icon: User },
    { number: 3, title: "Contact & Media", subtitle: "Final Details", icon: CreditCard },
  ];

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between w-full mb-5 gap-3 sm:gap-0">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isActive = currentStep === step.number;
        const isCompleted = currentStep > step.number;
        const hasError = stepErrors?.[step.number] || false;
        const isLast = index === steps.length - 1;

        return (
          <div key={step.number} className="flex flex-col sm:flex-row items-center flex-1">
            <button
              type="button"
              onClick={() => onStepClick && onStepClick(step.number)}
              className={cn(
                "flex items-center gap-3 w-full sm:flex-1 cursor-pointer rounded-lg p-2 transition-colors",
                hasError && "bg-rose-100"
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full transition-colors shrink-0",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : isCompleted
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="text-left flex-1">
                <div
                  className={cn(
                    "text-sm font-semibold",
                    hasError
                      ? "text-destructive"
                      : isActive
                        ? "text-foreground"
                        : isCompleted
                          ? "text-foreground"
                          : "text-muted-foreground"
                  )}
                >
                  {step.title}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{step.subtitle}</div>
              </div>
            </button>
            {!isLast && (
              <ChevronRight
                className={cn(
                  "hidden sm:block mx-5 h-5 w-5 flex-shrink-0 self-center",
                  isCompleted ? "text-primary" : "text-muted-foreground"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// Character counter component for textareas
// function CharacterCounter({ current: currentLength, max: maxLength }: { current: number; max: number }) {
//   return (
//     <div className="text-xs text-muted-foreground text-right mt-1">
//       {currentLength.toLocaleString()}/{maxLength.toLocaleString()}
//     </div>
//   );
// }

export function VenueWizardForm({ mode, venue, defaultCountry, defaultCountryId }: VenueFormProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [venueId, setVenueId] = useState<string | undefined>(venue?.id);
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);
  const [showUseTemplateDialog, setShowUseTemplateDialog] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [pendingCreateData, setPendingCreateData] = useState<CreateVenueInput | null>(null);

  const { data: profile, isLoading: profileLoading } = useProfile();

  const createVenueMutation = useCreateVenue();
  const updateVenueMutation = useUpdateVenue();
  const checkDuplicateMutation = useCheckVenueDuplicate();

  const [duplicateVenue, setDuplicateVenue] = useState<{
    id: string;
    short_id: string | null;
    name: string;
    street: string | null;
    city: string;
    country: string | null;
  } | null>(null);

  const { isLoading: templatesLoading } = useVenueTemplates();
  const { data: selectedTemplate, isLoading: isLoadingTemplate } = useVenueTemplate(selectedTemplateId);
  const { data: countries = [] } = useCountries();

  const isEditing = mode === "edit";

  const countryCenter = useMemo(
    () => getCountryCoordinates(venue?.country || defaultCountry),
    [venue?.country, defaultCountry]
  );

  // Initialize form with default values
  const form = useForm<VenueFormData>({
    // Type assertion needed due to zodResolver type inference issue with merged schemas
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(venueStep1Schema.merge(venueStep2Schema).merge(venueStep3Schema)) as any,
    mode: "onSubmit", // Only validate on submit
    reValidateMode: "onChange", // Only re-validate on submit
    shouldFocusError: false, // Don't auto-focus on errors
    defaultValues: venue
      ? {
          name: venue.name,
          street: venue.street || venue.address || "",
          city: venue.city,
          country: venue.country || defaultCountry,
          country_id: venue.country_id || defaultCountryId || null,
          location_lat: venue.location_lat ?? undefined,
          location_lng: venue.location_lng ?? undefined,
          total_capacity: venue.total_capacity ?? undefined,
          number_of_tables: venue.number_of_tables ?? undefined,
          ticket_capacity: venue.ticket_capacity ?? undefined,
          sounds: venue.sounds ?? undefined,
          lights: venue.lights ?? undefined,
          screens: venue.screens ?? undefined,
          contact_person_name: venue.contact_person_name || "",
          contact_email: venue.contact_email ?? undefined,
          floor_plans: normalizeFloorPlans(venue.floor_plans),
          media: venue.media || [],
        }
      : {
          country: defaultCountry,
          country_id: defaultCountryId || null,
          floor_plans: [],
          media: [],
          sounds: undefined,
          lights: undefined,
          screens: undefined,
        },
  });

  const hasSetDefaultCountry = useRef(false);
  useEffect(() => {
    if (!defaultCountryId || venue) {
      if (venue) hasSetDefaultCountry.current = false;
      return;
    }
    if (hasSetDefaultCountry.current) return;
    hasSetDefaultCountry.current = true;
    form.setValue("country_id", defaultCountryId);
    const c = countries.find((x) => x.id === defaultCountryId);
    if (c) form.setValue("country", c.name);
  }, [defaultCountryId, venue, countries, form]);

  // Check for duplicates when key fields change (debounced)
  const watchedName = form.watch("name");
  const watchedStreet = form.watch("street");
  const watchedCity = form.watch("city");
  const watchedCountry = form.watch("country") || defaultCountry;

  useEffect(() => {
    // Reset duplicate check when fields change
    setDuplicateVenue(null);

    // Debounce the duplicate check
    const timeoutId = setTimeout(async () => {
      const name = watchedName?.trim();
      const street = watchedStreet?.trim();
      const city = watchedCity?.trim();
      const country = watchedCountry?.trim();

      // Only check if all required fields have meaningful content
      if (name && name.length >= 2 && street && street.length >= 2 && city && city.length >= 2 && country) {
        try {
          // When editing, always exclude current venue by id from props so we don't flag self as duplicate (avoids race with venueId state after redirect)
          const excludeId = isEditing && venue?.id ? venue.id : venueId;
          const result = await checkDuplicateMutation.mutateAsync({
            name,
            street,
            city,
            country,
            excludeId,
          });

          setDuplicateVenue(result.duplicateVenue);
        } catch (error) {
          console.error("Failed to check duplicate:", error);
          setDuplicateVenue(null);
        }
      }
    }, 500);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedName, watchedStreet, watchedCity, watchedCountry, venueId, isEditing, venue?.id]);

  useEffect(() => {
    if (selectedTemplate && !isEditing) {
      const templateData = selectedTemplate.template_data as Record<string, unknown>;
      if (templateData.name) form.setValue("name", templateData.name as string);
      if (templateData.street) form.setValue("street", templateData.street as string);
      if (templateData.city) form.setValue("city", templateData.city as string);
      if (templateData.country) form.setValue("country", templateData.country as string);
      if (templateData.country_id) form.setValue("country_id", templateData.country_id as string);
      if (templateData.location_lat !== undefined) form.setValue("location_lat", templateData.location_lat as number);
      if (templateData.location_lng !== undefined) form.setValue("location_lng", templateData.location_lng as number);
      if (templateData.total_capacity !== undefined)
        form.setValue("total_capacity", templateData.total_capacity as number);
      if (templateData.number_of_tables !== undefined)
        form.setValue("number_of_tables", templateData.number_of_tables as number);
      if (templateData.ticket_capacity !== undefined)
        form.setValue("ticket_capacity", templateData.ticket_capacity as number);
      if (templateData.sounds !== undefined) form.setValue("sounds", templateData.sounds as string);
      if (templateData.lights !== undefined) form.setValue("lights", templateData.lights as string);
      if (templateData.screens !== undefined) form.setValue("screens", templateData.screens as string);
      if (
        (templateData.sounds === undefined ||
          templateData.lights === undefined ||
          templateData.screens === undefined) &&
        templateData.technical_specs_text
      ) {
        try {
          const o = JSON.parse(templateData.technical_specs_text as string) as Record<string, string>;
          if (templateData.sounds === undefined && o.sounds !== undefined) form.setValue("sounds", o.sounds);
          if (templateData.lights === undefined && o.lights !== undefined) form.setValue("lights", o.lights);
          if (templateData.screens === undefined && o.screens !== undefined) form.setValue("screens", o.screens);
        } catch {
          /* ignore */
        }
      }
      if (templateData.contact_person_name)
        form.setValue("contact_person_name", templateData.contact_person_name as string);
      if (templateData.contact_email !== undefined)
        form.setValue("contact_email", templateData.contact_email as string);
      if (templateData.floor_plans)
        form.setValue(
          "floor_plans",
          normalizeFloorPlans(templateData.floor_plans as (string | { url: string; name?: string })[])
        );
      if (templateData.media)
        form.setValue("media", templateData.media as { url: string; type: "photo" | "video"; isCover?: boolean }[]);
      setShowUseTemplateDialog(false);
      toast.success(`Template "${selectedTemplate.name}" loaded`);
    }
  }, [selectedTemplate, form, isEditing]);

  // Calculate step errors for visual feedback (only after submission or duplicate)
  // Since validation only happens on onSubmit, errors only exist after form submission
  const stepErrors = useMemo(() => {
    const errors: Record<number, boolean> = {};

    // Step 1 has error if duplicate venue exists (always show this)
    if (duplicateVenue) {
      errors[1] = true;
    }

    // Only calculate field errors if form has been submitted (when validation occurs)
    if (!form.formState.isSubmitted) {
      return errors;
    }

    // Check step 1
    const step1Fields: (keyof VenueFormData)[] = ["name", "street", "city", "country"];
    errors[1] = errors[1] || step1Fields.some((field) => !!form.formState.errors[field]);

    const step2Fields: (keyof VenueFormData)[] = [
      "total_capacity",
      "number_of_tables",
      "ticket_capacity",
      "sounds",
      "lights",
      "screens",
    ];
    errors[2] = step2Fields.some((field) => !!form.formState.errors[field]);

    const step3Fields: (keyof VenueFormData)[] = ["contact_person_name", "contact_email", "floor_plans", "media"];
    errors[3] = step3Fields.some((field) => !!form.formState.errors[field]);

    return errors;
  }, [form.formState.errors, form.formState.isSubmitted, duplicateVenue]);

  // Validate current step
  const validateStep = async (step: number): Promise<boolean> => {
    let schema: typeof venueStep1Schema | typeof venueStep2Schema | typeof venueStep3Schema;
    switch (step) {
      case 1:
        schema = venueStep1Schema;
        break;
      case 2:
        schema = venueStep2Schema;
        break;
      case 3:
        schema = venueStep3Schema;
        break;
      default:
        return true;
    }

    // Trigger validation for all fields in the current step
    const stepFields: (keyof VenueFormData)[] = [];
    if (step === 1) {
      stepFields.push("name", "street", "city", "country", "location_lat", "location_lng");
    } else if (step === 2) {
      stepFields.push("total_capacity", "number_of_tables", "ticket_capacity", "sounds", "lights", "screens");
    } else if (step === 3) {
      stepFields.push("contact_person_name", "contact_email", "floor_plans", "media");
    }

    // Trigger validation for step fields
    const validationResults = await Promise.all(stepFields.map((field) => form.trigger(field)));

    // Also validate with schema
    const values = form.getValues();
    const result = schema.safeParse(values);

    if (!result.success) {
      // Set errors for the current step
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof VenueFormData;
        form.setError(field, { message: issue.message, type: "validation" });
      });
      return false;
    }

    // Check if any field validation failed
    if (validationResults.some((valid) => !valid)) {
      return false;
    }

    return true;
  };

  const handleNext = (e?: React.MouseEvent<HTMLButtonElement>) => {
    // Prevent form submission if event is provided
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Block if duplicate exists in Step 1
    if (currentStep === 1 && duplicateVenue) {
      toast.error("Cannot proceed with duplicate venue", {
        description: "Please modify the venue name, address, or city to create a unique venue.",
      });
      return;
    }

    // Prevent double-click by checking if already on last step
    setCurrentStep((prev) => {
      if (prev >= 3) return prev;
      const nextStep = Math.min(prev + 1, 3);
      // Scroll to top when moving to next step
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }, 0);
      return nextStep;
    });
  };

  const handleStepClick = (step: number) => {
    // Allow free navigation to any step - no validation
    setCurrentStep(step);
    // Scroll to top when changing steps
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 0);
  };

  const handlePrevious = (e?: React.MouseEvent<HTMLButtonElement>) => {
    // Prevent form submission if event is provided
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    setCurrentStep((prev) => {
      const prevStep = Math.max(prev - 1, 1);
      // Scroll to top when going to previous step
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }, 0);
      return prevStep;
    });
  };

  const onSubmit = async (data: VenueFormData): Promise<void> => {
    // Validate all steps before submission
    // Only submit if we're on the final step
    if (currentStep !== 3) {
      return;
    }

    // Block submission if duplicate venue exists
    if (duplicateVenue) {
      toast.error("Cannot create duplicate venue", {
        description:
          "A venue with the same name, address, and city already exists. Please modify the venue details or view the existing venue.",
      });
      setCurrentStep(1);
      return;
    }

    const step1Valid = await validateStep(1);
    const step2Valid = await validateStep(2);
    const step3Valid = await validateStep(3);

    if (!step1Valid || !step2Valid || !step3Valid) {
      // Find the first step with errors and navigate to it
      if (!step1Valid) {
        setCurrentStep(1);
        toast.error("Please fix errors in Step 1 before submitting");
      } else if (!step2Valid) {
        setCurrentStep(2);
        toast.error("Please fix errors in Step 2 before submitting");
      } else if (!step3Valid) {
        setCurrentStep(3);
        toast.error("Please fix errors in Step 3 before submitting");
      }
      return;
    }

    const submitData: CreateVenueInput = {
      ...data,
      floor_plans: data.floor_plans || [],
      media: data.media || [],
    };

    try {
      if (isEditing && venueId) {
        await updateVenueMutation.mutateAsync({ id: venueId, input: submitData });
        router.push("/dashboard/venues");
      } else {
        // Global Directors must verify via OTP before creating a venue
        if (profile?.role === "global_director") {
          setPendingCreateData(submitData);
          setShowOtpDialog(true);
          return;
        }
        const result = await createVenueMutation.mutateAsync(submitData);
        if (result.isDuplicate) {
          // This shouldn't happen since we check in Step 1, but handle it anyway
          setDuplicateVenue(result.duplicateVenue || null);
          toast.error("Cannot create duplicate venue", {
            description:
              "A venue with the same name, address, and city already exists. Please modify the venue details.",
          });
          setCurrentStep(1);
        } else {
          const newVenue = result.venue;
          setVenueId(newVenue.id);
          // Use short_id if available, otherwise fallback to UUID
          const shortId = newVenue.short_id;
          if (shortId) {
            router.push(`/dashboard/venues/${shortId}/edit`);
          } else {
            router.push(`/dashboard/venues/${newVenue.id}/edit`);
          }
        }
      }
    } catch (error) {
      // Error is handled by the mutation hook (toast shown)
      console.error("Failed to save venue:", error);
    }
  };

  const handleOtpVerified = async (verificationToken: string) => {
    if (!pendingCreateData) return;
    setShowOtpDialog(false);
    try {
      const result = await createVenueMutation.mutateAsync({
        ...pendingCreateData,
        verificationToken,
      });
      setPendingCreateData(null);
      if (result.isDuplicate) {
        setDuplicateVenue(result.duplicateVenue || null);
        toast.error("Cannot create duplicate venue", {
          description: "A venue with the same name, address, and city already exists. Please modify the venue details.",
        });
        setCurrentStep(1);
      } else {
        const newVenue = result.venue;
        setVenueId(newVenue.id);
        const shortId = newVenue.short_id;
        if (shortId) {
          router.push(`/dashboard/venues/${shortId}/edit`);
        } else {
          router.push(`/dashboard/venues/${newVenue.id}/edit`);
        }
      }
    } catch (error) {
      console.error("Failed to create venue after OTP:", error);
      setPendingCreateData(null);
    }
  };

  const handleAddressChange = (
    address: string,
    lat: number | null,
    lng: number | null,
    city?: string,
    _region?: string,
    _country?: string
  ) => {
    void _region;
    void _country;
    form.setValue("street", address);
    if (lat !== null && lng !== null) {
      form.setValue("location_lat", lat);
      form.setValue("location_lng", lng);
    }
    if (city) form.setValue("city", city);
  };

  const handleLocationSelect = async (lat: number, lng: number) => {
    form.setValue("location_lat", lat);
    form.setValue("location_lng", lng);

    // Reverse geocode to get address from coordinates
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
        {
          headers: {
            "User-Agent": "EventPlannerApp/1.0", // Required by Nominatim
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch address");
      }

      const data = await response.json();

      if (data && data.address) {
        // Build street address from the address components
        const addressParts: string[] = [];

        // Add house number and road (street name)
        if (data.address.house_number) {
          addressParts.push(data.address.house_number);
        }
        if (data.address.road) {
          addressParts.push(data.address.road);
        }

        // If we have a street address, use it; otherwise use display_name
        const streetAddress = addressParts.length > 0 ? addressParts.join(" ") : data.display_name || "";

        // Update street address
        if (streetAddress) {
          form.setValue("street", streetAddress);
        }

        // Update city if available
        const city = data.address.city || data.address.town || data.address.village || "";
        if (city) {
          form.setValue("city", city);
        }
      }
    } catch (error) {
      console.error("Error reverse geocoding address:", error);
      // Don't show error to user - just silently fail
      // The coordinates are still set, which is the main requirement
    }
  };

  // Handle template selection from dialog
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
  };

  // Handle save as template
  const handleSaveAsTemplate = () => {
    setShowSaveTemplateDialog(true);
  };

  const getCurrentFormData = (): CreateVenueInput => form.getValues();

  return (
    <>
      <form
        onSubmit={form.handleSubmit(onSubmit as Parameters<typeof form.handleSubmit>[0])}
        className="space-y-4 sm:space-y-6 p-1 sm:p-0"
      >
        {/* Use Template - Only show in create mode */}
        {!isEditing && (
          <Card>
            <CardContent className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-sm font-medium">Use a saved template</div>
                <p className="text-xs text-muted-foreground">
                  Quickly pre-fill this form from one of your venue templates. You can still edit everything after.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowUseTemplateDialog(true)}
                disabled={templatesLoading || isLoadingTemplate}
              >
                {isLoadingTemplate ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading template...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Use template
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Loading Template Banner */}
        {!isEditing && isLoadingTemplate && selectedTemplateId && (
          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="flex items-center gap-3 pt-6">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <div className="flex-1">
                <div className="text-sm font-medium">Loading template...</div>
                <p className="text-xs text-muted-foreground">
                  Please wait while we load your template and apply it to the form.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step Indicator */}
        <StepIndicator currentStep={currentStep} totalSteps={3} onStepClick={handleStepClick} stepErrors={stepErrors} />

        {/* Step 1: Basic Information */}
        {currentStep === 1 && (
          <Card>
            <CardContent className="space-y-4 p-1 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Venue Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Venue Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    {...form.register("name")}
                    placeholder="Conference Center"
                    aria-invalid={!!form.formState.errors.name}
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                  )}
                </div>

                {/* Country - selectable */}
                <div className="space-y-2">
                  <LocationCombobox
                    value={form.watch("country_id") ?? undefined}
                    onValueChange={(value) => {
                      const c = countries.find((x) => x.id === value);
                      if (c) {
                        form.setValue("country_id", c.id);
                        form.setValue("country", c.name);
                      } else {
                        form.setValue("country_id", null);
                        form.setValue("country", "");
                      }
                    }}
                    options={countries.map((c) => ({ id: c.id, name: c.name }))}
                    placeholder="Select country"
                    label="Country"
                    error={form.formState.errors.country?.message}
                  />
                </div>

                {/* City */}
                <div className="space-y-2">
                  <Label htmlFor="city">
                    City <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="city"
                    {...form.register("city")}
                    placeholder="San Francisco"
                    aria-invalid={!!form.formState.errors.city}
                  />
                  {form.formState.errors.city && (
                    <p className="text-sm text-destructive">{form.formState.errors.city.message}</p>
                  )}
                </div>
              </div>

              {/* Street Address */}
              <div className="space-y-2">
                <Label htmlFor="street">
                  Street Address <span className="text-destructive">*</span>
                </Label>
                <AddressAutocomplete
                  id="street"
                  value={form.watch("street") || ""}
                  onChange={handleAddressChange}
                  placeholder="Enter street address (autocomplete enabled)"
                  error={form.formState.errors.street?.message}
                  geocodeOnBlur
                  geocodeContext={{
                    city: form.watch("city") || undefined,
                    country: form.watch("country") || undefined,
                  }}
                />
              </div>

              {/* Map Selector */}
              <VenueMapSelector
                lat={form.watch("location_lat") ?? null}
                lng={form.watch("location_lng") ?? null}
                onLocationSelect={handleLocationSelect}
                countryCenter={countryCenter}
                stateCenter={undefined}
                error={form.formState.errors.location_lat?.message || form.formState.errors.location_lng?.message}
              />

              {/* Duplicate Venue Error */}
              {duplicateVenue && (
                <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-destructive">Duplicate Venue Detected</h4>
                      <p className="text-sm text-destructive/90 mt-1">
                        A venue with the same name, address, and city already exists. You cannot create a duplicate
                        venue.
                      </p>
                      <div className="mt-2 text-sm text-muted-foreground">
                        <p>
                          <strong>Existing venue:</strong> {duplicateVenue.name}
                        </p>
                        <p>
                          {duplicateVenue.street}, {duplicateVenue.city}
                          {duplicateVenue.country ? `, ${duplicateVenue.country}` : ""}
                        </p>
                      </div>
                      {duplicateVenue.short_id && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-3"
                          onClick={() => router.push(`/dashboard/venues/${duplicateVenue.short_id}`)}
                        >
                          View Existing Venue
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Duplicate Check Loading */}
              {checkDuplicateMutation.isPending && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking for duplicate venues...
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 2: Capacity & Features */}
        {currentStep === 2 && (
          <Card>
            <CardContent className="space-y-4 p-1 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="total_capacity">Total Capacity</Label>
                  <Input
                    id="total_capacity"
                    type="number"
                    min="0"
                    max="99999999"
                    {...form.register("total_capacity", { valueAsNumber: true })}
                    placeholder="0"
                    aria-invalid={!!form.formState.errors.total_capacity}
                  />
                  {form.formState.errors.total_capacity && (
                    <p className="text-sm text-destructive">{form.formState.errors.total_capacity.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="number_of_tables">Number of Tables</Label>
                  <Input
                    id="number_of_tables"
                    type="number"
                    min="0"
                    max="99999999"
                    {...form.register("number_of_tables", { valueAsNumber: true })}
                    placeholder="0"
                    aria-invalid={!!form.formState.errors.number_of_tables}
                  />
                  {form.formState.errors.number_of_tables && (
                    <p className="text-sm text-destructive">{form.formState.errors.number_of_tables.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ticket_capacity">Ticket Capacity</Label>
                  <Input
                    id="ticket_capacity"
                    type="number"
                    min="0"
                    max="99999999"
                    {...form.register("ticket_capacity", { valueAsNumber: true })}
                    placeholder="0"
                    aria-invalid={!!form.formState.errors.ticket_capacity}
                  />
                  {form.formState.errors.ticket_capacity && (
                    <p className="text-sm text-destructive">{form.formState.errors.ticket_capacity.message}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sounds">Sounds</Label>
                  <textarea
                    id="sounds"
                    {...form.register("sounds")}
                    maxLength={MAX_TEXTAREA_LENGTH}
                    placeholder="Sound equipment, PA, etc."
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    aria-invalid={!!form.formState.errors.sounds}
                  />
                  {form.formState.errors.sounds && (
                    <p className="text-sm text-destructive">{form.formState.errors.sounds.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lights">Lights</Label>
                  <textarea
                    id="lights"
                    {...form.register("lights")}
                    maxLength={MAX_TEXTAREA_LENGTH}
                    placeholder="Lighting options..."
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    aria-invalid={!!form.formState.errors.lights}
                  />
                  {form.formState.errors.lights && (
                    <p className="text-sm text-destructive">{form.formState.errors.lights.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="screens">Screens</Label>
                  <textarea
                    id="screens"
                    {...form.register("screens")}
                    maxLength={MAX_TEXTAREA_LENGTH}
                    placeholder="Screens, projectors..."
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    aria-invalid={!!form.formState.errors.screens}
                  />
                  {form.formState.errors.screens && (
                    <p className="text-sm text-destructive">{form.formState.errors.screens.message}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Contact & Media */}
        {currentStep === 3 && (
          <Card>
            <CardContent className="space-y-4 p-1 sm:p-6">
              <div className="space-y-2">
                <Label htmlFor="contact_person_name">
                  Contact Person Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="contact_person_name"
                  {...form.register("contact_person_name")}
                  placeholder="John Doe"
                  aria-invalid={!!form.formState.errors.contact_person_name}
                />
                {form.formState.errors.contact_person_name && (
                  <p className="text-sm text-destructive">{form.formState.errors.contact_person_name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_email">Venue Contact Email (with verification)</Label>
                <Input
                  id="contact_email"
                  type="email"
                  {...form.register("contact_email")}
                  placeholder="contact@venue.com"
                  aria-invalid={!!form.formState.errors.contact_email}
                />
                <p className="text-xs text-muted-foreground">
                  This email will need to be verified by the contact person using an OTP code sent to their inbox. Until
                  then, the venue will not show a verified badge.
                </p>
                {form.formState.errors.contact_email && (
                  <p className="text-sm text-destructive">{form.formState.errors.contact_email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Floor Plans (PDF, images)</Label>
                <VenueFloorPlansUpload
                  floorPlans={normalizeFloorPlans(form.watch("floor_plans"))}
                  onFloorPlansChange={(items) => form.setValue("floor_plans", items)}
                  error={form.formState.errors.floor_plans?.message}
                />
              </div>
              <div className="space-y-2">
                <Label>Photos / Videos (max 10, set cover image)</Label>
                <VenueMediaUpload
                  media={form.watch("media") || []}
                  onMediaChange={(items) => form.setValue("media", items)}
                  venueId={venueId}
                  error={form.formState.errors.media?.message}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-4">
          <div>
            {currentStep > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={(e) => handlePrevious(e)}
                disabled={createVenueMutation.isPending || updateVenueMutation.isPending}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Previous
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            {/* Save as Template button - Only show in step 3 and when form has data */}
            {currentStep === 3 && !isEditing && (
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveAsTemplate}
                disabled={createVenueMutation.isPending || updateVenueMutation.isPending}
              >
                <Save className="mr-2 h-4 w-4" />
                Save as Template
              </Button>
            )}
            {currentStep < 3 ? (
              <Button
                type="button"
                onClick={(e) => handleNext(e)}
                disabled={
                  createVenueMutation.isPending ||
                  updateVenueMutation.isPending ||
                  checkDuplicateMutation.isPending ||
                  (currentStep === 1 && !!duplicateVenue)
                }
              >
                {checkDuplicateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={
                  createVenueMutation.isPending ||
                  updateVenueMutation.isPending ||
                  !!duplicateVenue ||
                  (!isEditing && profileLoading)
                }
              >
                {createVenueMutation.isPending || updateVenueMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isEditing ? "Updating..." : "Creating..."}
                  </>
                ) : isEditing ? (
                  "Update Venue"
                ) : (
                  "Create Venue"
                )}
              </Button>
            )}
          </div>
        </div>
      </form>

      {/* Save Template Dialog */}
      <SaveVenueTemplateDialog
        open={showSaveTemplateDialog}
        onOpenChange={setShowSaveTemplateDialog}
        venueData={getCurrentFormData()}
        onSuccess={() => {
          setShowSaveTemplateDialog(false);
        }}
      />

      {/* Use Template Dialog */}
      {!isEditing && (
        <UseVenueTemplateDialog
          open={showUseTemplateDialog}
          onOpenChange={(open) => {
            setShowUseTemplateDialog(open);
            // Reset selected template when dialog closes
            if (!open && !isLoadingTemplate) {
              setSelectedTemplateId(null);
            }
          }}
          onSelectTemplate={handleTemplateSelect}
          isLoadingTemplate={isLoadingTemplate}
        />
      )}

      {/* OTP verification for Global Director venue create */}
      {!isEditing && profile?.id && (
        <OtpVerificationDialog
          open={showOtpDialog}
          onOpenChange={(open) => {
            setShowOtpDialog(open);
            if (!open) setPendingCreateData(null);
          }}
          onVerified={handleOtpVerified}
          contextType="venue_create"
          contextId={profile.id}
          action="create"
          title="Verify before creating venue"
          description="We sent a verification code to your email. Enter it below to create the venue."
        />
      )}
    </>
  );
}
