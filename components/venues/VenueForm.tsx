"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DateInput } from "@/components/ui/date-input";
import { LocationCombobox } from "@/components/ui/location-combobox";
import { PhoneInput } from "@/components/ui/phone-input";
import { PriceInput } from "@/components/ui/price-input";
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
import { VenueImageUpload } from "./VenueImageUpload";
import { useStatesByCountry } from "@/lib/hooks/use-locations";
import { getCountryCoordinates, getStateCoordinates } from "@/lib/utils/country-coordinates";
import { getCountryCode } from "@/lib/utils/country-to-code";
import { MAX_TEXTAREA_LENGTH } from "@/lib/validation/venues.schema";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Loader2, Home, User, CreditCard, ChevronRight, Save, FileText } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useVenueTemplates, useVenueTemplate } from "@/lib/hooks/use-venues";
import { SaveVenueTemplateDialog } from "./SaveVenueTemplateDialog";
import { UseVenueTemplateDialog } from "./UseVenueTemplateDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface VenueFormProps {
  mode: "create" | "edit";
  venue?: VenueWithCreator;
  defaultState: string;
  defaultCountry: string;
  defaultCountryId?: string;
  defaultStateId?: string;
}

type VenueFormData = CreateVenueInput;

// Step indicator component matching the image style (horizontal, no borders)
function StepIndicator({
  currentStep,
  totalSteps,
  onStepClick,
  stepErrors,
}: {
  currentStep: number;
  totalSteps: number;
  onStepClick?: (step: number) => void;
  stepErrors?: Record<number, boolean>;
}) {
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
function CharacterCounter({ current: currentLength, max: maxLength }: { current: number; max: number }) {
  return (
    <div className="text-xs text-muted-foreground text-right mt-1">
      {currentLength.toLocaleString()}/{maxLength.toLocaleString()}
    </div>
  );
}

export function VenueForm({
  mode,
  venue,
  defaultState,
  defaultCountry,
  defaultCountryId,
  defaultStateId,
}: VenueFormProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [venueId, setVenueId] = useState<string | undefined>(venue?.id);
  const [selectedStateId, setSelectedStateId] = useState<string | undefined>(defaultStateId);
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);
  const [showUseTemplateDialog, setShowUseTemplateDialog] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // React Query mutations
  const createVenueMutation = useCreateVenue();
  const updateVenueMutation = useUpdateVenue();
  const checkDuplicateMutation = useCheckVenueDuplicate();

  // Duplicate venue state
  const [duplicateVenue, setDuplicateVenue] = useState<{
    id: string;
    short_id: string | null;
    name: string;
    street: string | null;
    city: string;
    country: string | null;
  } | null>(null);

  // Template queries
  const { data: templates = [], isLoading: templatesLoading } = useVenueTemplates();
  const { data: selectedTemplate, isLoading: isLoadingTemplate } = useVenueTemplate(selectedTemplateId);
  const [uploadedImageFiles, setUploadedImageFiles] = useState<File[]>([]);
  const [availabilityStartDate, setAvailabilityStartDate] = useState<Date | undefined>(
    venue?.availability_start_date ? new Date(venue.availability_start_date) : undefined
  );
  const [availabilityEndDate, setAvailabilityEndDate] = useState<Date | undefined>(
    venue?.availability_end_date ? new Date(venue.availability_end_date) : undefined
  );

  const isEditing = mode === "edit";

  // Get states for the country
  const { data: states = [], isLoading: loadingStates } = useStatesByCountry(defaultCountryId ?? null);

  // Get country center coordinates for map
  const countryCenter = useMemo(() => getCountryCoordinates(defaultCountry), [defaultCountry]);

  // Get state center coordinates for map
  const selectedState = states.find((s) => s.id === selectedStateId);
  const stateCenter = useMemo(() => {
    if (selectedState) {
      return getStateCoordinates(selectedState.name, defaultCountry);
    }
    return undefined;
  }, [selectedState, defaultCountry]);

  // Get country code for phone input
  const phoneDefaultCountry = useMemo(() => getCountryCode(defaultCountry), [defaultCountry]);

  // Initialize form with default values
  const form = useForm<VenueFormData>({
    // Type assertion needed due to zodResolver type inference issue with merged schemas
    resolver: zodResolver(venueStep1Schema.merge(venueStep2Schema).merge(venueStep3Schema)) as any,
    mode: "onSubmit", // Only validate on submit
    reValidateMode: "onChange", // Only re-validate on submit
    shouldFocusError: false, // Don't auto-focus on errors
    defaultValues: venue
      ? {
          name: venue.name,
          street: venue.street || venue.address || "",
          city: venue.city,
          state: venue.state || defaultState || null,
          country: venue.country || defaultCountry,
          country_id: venue.country_id || defaultCountryId || null,
          state_id: venue.state_id || defaultStateId || null,
          location_lat: venue.location_lat ?? undefined,
          location_lng: venue.location_lng ?? undefined,
          capacity_standing: venue.capacity_standing ?? undefined,
          capacity_seated: venue.capacity_seated ?? undefined,
          available_rooms_halls: venue.available_rooms_halls ?? undefined,
          technical_specs: venue.technical_specs
            ? {
                sound: venue.technical_specs.sound ?? false,
                lights: venue.technical_specs.lights ?? false,
                screens: venue.technical_specs.screens ?? false,
              }
            : undefined,
          availability_start_date: venue.availability_start_date
            ? format(new Date(venue.availability_start_date), "yyyy-MM-dd")
            : undefined,
          availability_end_date: venue.availability_end_date
            ? format(new Date(venue.availability_end_date), "yyyy-MM-dd")
            : undefined,
          base_pricing: venue.base_pricing ?? undefined,
          contact_person_name: venue.contact_person_name || "",
          contact_email: venue.contact_email ?? undefined,
          contact_phone: venue.contact_phone ?? undefined,
          restrictions: venue.restrictions ?? undefined,
          images: venue.images || [],
        }
      : {
          state: defaultState || null,
          country: defaultCountry,
          country_id: defaultCountryId || null,
          state_id: defaultStateId || null,
          technical_specs: {
            sound: false,
            lights: false,
            screens: false,
          },
          images: [],
        },
  });

  // Update state and state_id when stateId changes
  useEffect(() => {
    if (selectedStateId && states.length > 0) {
      const selectedState = states.find((s) => s.id === selectedStateId);
      if (selectedState) {
        form.setValue("state", selectedState.name);
        form.setValue("state_id", selectedState.id);
      }
    } else if (!selectedStateId) {
      form.setValue("state", null);
      form.setValue("state_id", null);
    }
  }, [selectedStateId, states, form]);

  // Set country_id when form initializes or country changes
  useEffect(() => {
    if (defaultCountryId) {
      form.setValue("country_id", defaultCountryId);
    }
  }, [defaultCountryId, form]);

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
          const result = await checkDuplicateMutation.mutateAsync({
            name,
            street,
            city,
            country,
            excludeId: venueId, // Exclude current venue when editing
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
  }, [watchedName, watchedStreet, watchedCity, watchedCountry, venueId]);

  // Load template data when a template is selected
  useEffect(() => {
    if (selectedTemplate && !isEditing) {
      const templateData = selectedTemplate.template_data;

      // Load template data into form
      if (templateData.name) form.setValue("name", templateData.name);
      if (templateData.street) form.setValue("street", templateData.street);
      if (templateData.city) form.setValue("city", templateData.city);
      if (templateData.state) {
        form.setValue("state", templateData.state);
        // Try to find matching state ID
        if (templateData.state_id) {
          setSelectedStateId(templateData.state_id);
          form.setValue("state_id", templateData.state_id);
        } else if (templateData.state) {
          const matchingState = states.find((s) => s.name === templateData.state);
          if (matchingState) {
            setSelectedStateId(matchingState.id);
            form.setValue("state_id", matchingState.id);
          }
        }
      }
      if (templateData.country) form.setValue("country", templateData.country);
      if (templateData.country_id) form.setValue("country_id", templateData.country_id);
      if (templateData.location_lat !== undefined) form.setValue("location_lat", templateData.location_lat);
      if (templateData.location_lng !== undefined) form.setValue("location_lng", templateData.location_lng);
      if (templateData.capacity_standing !== undefined)
        form.setValue("capacity_standing", templateData.capacity_standing);
      if (templateData.capacity_seated !== undefined) form.setValue("capacity_seated", templateData.capacity_seated);
      if (templateData.available_rooms_halls !== undefined)
        form.setValue("available_rooms_halls", templateData.available_rooms_halls);
      if (templateData.technical_specs) form.setValue("technical_specs", templateData.technical_specs);
      if (templateData.availability_start_date) {
        const startDate = new Date(templateData.availability_start_date);
        setAvailabilityStartDate(startDate);
        form.setValue("availability_start_date", format(startDate, "yyyy-MM-dd"));
      }
      if (templateData.availability_end_date) {
        const endDate = new Date(templateData.availability_end_date);
        setAvailabilityEndDate(endDate);
        form.setValue("availability_end_date", format(endDate, "yyyy-MM-dd"));
      }
      if (templateData.base_pricing !== undefined) form.setValue("base_pricing", templateData.base_pricing);
      if (templateData.contact_person_name) form.setValue("contact_person_name", templateData.contact_person_name);
      if (templateData.contact_email) form.setValue("contact_email", templateData.contact_email);
      if (templateData.contact_phone) form.setValue("contact_phone", templateData.contact_phone);
      if (templateData.restrictions !== undefined) form.setValue("restrictions", templateData.restrictions);
      if (templateData.images) form.setValue("images", templateData.images);

      // Close the dialog after template is loaded
      setShowUseTemplateDialog(false);
      toast.success(`Template "${selectedTemplate.name}" loaded`);
    }
  }, [selectedTemplate, form, states, isEditing]);

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

    // Check step 2
    const step2Fields: (keyof VenueFormData)[] = [
      "capacity_standing",
      "capacity_seated",
      "availability_start_date",
      "availability_end_date",
      "base_pricing",
    ];
    errors[2] = step2Fields.some((field) => !!form.formState.errors[field]);

    // Check step 3
    const step3Fields: (keyof VenueFormData)[] = ["contact_person_name", "contact_email", "contact_phone"];
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
      stepFields.push("name", "street", "city", "country", "state", "location_lat", "location_lng");
    } else if (step === 2) {
      stepFields.push(
        "capacity_standing",
        "capacity_seated",
        "available_rooms_halls",
        "technical_specs",
        "availability_start_date",
        "availability_end_date",
        "base_pricing"
      );
    } else if (step === 3) {
      stepFields.push("contact_person_name", "contact_email", "contact_phone", "restrictions", "images");
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

    // Images are already uploaded via API, so we can use them directly
    const submitData = {
      ...data,
      images: data.images || [], // Use uploaded image URLs
    };

    try {
      if (isEditing && venueId) {
        await updateVenueMutation.mutateAsync({ id: venueId, input: submitData });
        router.push("/dashboard/venues");
      } else {
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

  const handleAddressChange = (
    address: string,
    lat: number | null,
    lng: number | null,
    city?: string,
    region?: string,
    country?: string
  ) => {
    form.setValue("street", address);
    if (lat !== null && lng !== null) {
      form.setValue("location_lat", lat);
      form.setValue("location_lng", lng);
    }
    if (city) {
      form.setValue("city", city);
    }
    if (region) {
      form.setValue("state", region);
      // Try to find matching state in the list
      const matchingState = states.find((s) => s.name.toLowerCase().includes(region.toLowerCase()));
      if (matchingState) {
        setSelectedStateId(matchingState.id);
        form.setValue("state_id", matchingState.id);
      }
    }
    // Don't update country - it's locked
    // country_id is already set via useEffect
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

        // Update state if available
        const region = data.address.state || "";
        if (region) {
          form.setValue("state", region);
          // Try to find matching state in the list
          const matchingState = states.find((s) => s.name.toLowerCase().includes(region.toLowerCase()));
          if (matchingState) {
            setSelectedStateId(matchingState.id);
            form.setValue("state_id", matchingState.id);
          }
        }
      }
    } catch (error) {
      console.error("Error reverse geocoding address:", error);
      // Don't show error to user - just silently fail
      // The coordinates are still set, which is the main requirement
    }
  };

  // Get today's date and max date (1 year from now)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = new Date(today);
  maxDate.setFullYear(maxDate.getFullYear() + 1);

  // Handle date changes
  const handleStartDateChange = (date: Date | undefined) => {
    setAvailabilityStartDate(date);
    if (date) {
      form.setValue("availability_start_date", format(date, "yyyy-MM-dd"));
      // If end date is before new start date, clear it
      if (availabilityEndDate && date > availabilityEndDate) {
        setAvailabilityEndDate(undefined);
        form.setValue("availability_end_date", undefined);
      }
    } else {
      form.setValue("availability_start_date", undefined);
    }
  };

  const handleEndDateChange = (date: Date | undefined) => {
    setAvailabilityEndDate(date);
    if (date) {
      form.setValue("availability_end_date", format(date, "yyyy-MM-dd"));
    } else {
      form.setValue("availability_end_date", undefined);
    }
  };

  // Calculate max end date (1 year from start or maxDate)
  const maxEndDate = useMemo(() => {
    if (availabilityStartDate) {
      const oneYearFromStart = new Date(availabilityStartDate);
      oneYearFromStart.setFullYear(oneYearFromStart.getFullYear() + 1);
      return oneYearFromStart < maxDate ? oneYearFromStart : maxDate;
    }
    return maxDate;
  }, [availabilityStartDate, maxDate]);

  // Handle template selection from dialog
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
  };

  // Handle save as template
  const handleSaveAsTemplate = () => {
    const formData = form.getValues();
    setShowSaveTemplateDialog(true);
  };

  // Get current form data for template saving
  const getCurrentFormData = (): CreateVenueInput => {
    const formData = form.getValues();
    return {
      ...formData,
      availability_start_date: availabilityStartDate ? format(availabilityStartDate, "yyyy-MM-dd") : undefined,
      availability_end_date: availabilityEndDate ? format(availabilityEndDate, "yyyy-MM-dd") : undefined,
    };
  };

  return (
    <>
      <form
        onSubmit={form.handleSubmit(onSubmit as Parameters<typeof form.handleSubmit>[0])}
        className="space-y-4 sm:space-y-6 p-1 sm:p-0"
      >
        {/* Use Template - Only show in create mode */}
        {!isEditing && (
          <Card>
            <CardContent className="flex items-center justify-between gap-4 pt-6">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                {/* Country - Locked */}
                <div className="space-y-2">
                  <Label htmlFor="country">
                    Country <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="country"
                    {...form.register("country")}
                    value={defaultCountry}
                    disabled
                    className="bg-muted cursor-not-allowed"
                    aria-invalid={!!form.formState.errors.country}
                  />
                  {form.formState.errors.country && (
                    <p className="text-sm text-destructive">{form.formState.errors.country.message}</p>
                  )}
                </div>

                {/* State - Using LocationCombobox */}
                <div className="space-y-2">
                  <LocationCombobox
                    value={selectedStateId}
                    onValueChange={(value) => {
                      setSelectedStateId(value);
                      if (value) {
                        const selectedState = states.find((s) => s.id === value);
                        if (selectedState) {
                          form.setValue("state", selectedState.name);
                          form.setValue("state_id", selectedState.id);
                        }
                      } else {
                        form.setValue("state", null);
                        form.setValue("state_id", null);
                      }
                    }}
                    options={states.map((s) => ({ id: s.id, name: s.name }))}
                    placeholder="Select state"
                    disabled={!defaultCountryId || loadingStates}
                    loading={loadingStates}
                    label="State"
                    error={form.formState.errors.state?.message}
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
                />
              </div>

              {/* Map Selector */}
              <VenueMapSelector
                lat={form.watch("location_lat") ?? null}
                lng={form.watch("location_lng") ?? null}
                onLocationSelect={handleLocationSelect}
                countryCenter={countryCenter}
                stateCenter={stateCenter}
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
              {/* Capacity Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="capacity_standing">Standing Capacity</Label>
                  <Input
                    id="capacity_standing"
                    type="number"
                    min="0"
                    max="99999999"
                    {...form.register("capacity_standing", { valueAsNumber: true })}
                    placeholder="0"
                    aria-invalid={!!form.formState.errors.capacity_standing}
                  />
                  {form.formState.errors.capacity_standing && (
                    <p className="text-sm text-destructive">{form.formState.errors.capacity_standing.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="capacity_seated">Seated Capacity</Label>
                  <Input
                    id="capacity_seated"
                    type="number"
                    min="0"
                    max="99999999"
                    {...form.register("capacity_seated", { valueAsNumber: true })}
                    placeholder="0"
                    aria-invalid={!!form.formState.errors.capacity_seated}
                  />
                  {form.formState.errors.capacity_seated && (
                    <p className="text-sm text-destructive">{form.formState.errors.capacity_seated.message}</p>
                  )}
                </div>
              </div>

              {/* Available Rooms/Halls */}
              <div className="space-y-2">
                <Label htmlFor="available_rooms_halls">Available Rooms / Halls</Label>
                <textarea
                  id="available_rooms_halls"
                  {...form.register("available_rooms_halls")}
                  maxLength={MAX_TEXTAREA_LENGTH}
                  placeholder="Main Hall, Conference Room A, Conference Room B..."
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  aria-invalid={!!form.formState.errors.available_rooms_halls}
                />
                <CharacterCounter
                  current={(form.watch("available_rooms_halls") || "").length}
                  max={MAX_TEXTAREA_LENGTH}
                />
                {form.formState.errors.available_rooms_halls && (
                  <p className="text-sm text-destructive">{form.formState.errors.available_rooms_halls.message}</p>
                )}
              </div>

              {/* Technical Specs */}
              <div className="space-y-2">
                <Label>Technical Specs</Label>
                <div className="flex gap-6">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="sound"
                      checked={form.watch("technical_specs")?.sound || false}
                      onCheckedChange={(checked) => {
                        form.setValue("technical_specs", {
                          ...form.watch("technical_specs"),
                          sound: checked === true,
                        });
                      }}
                    />
                    <Label htmlFor="sound" className="font-normal cursor-pointer">
                      Sound
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="lights"
                      checked={form.watch("technical_specs")?.lights || false}
                      onCheckedChange={(checked) => {
                        form.setValue("technical_specs", {
                          ...form.watch("technical_specs"),
                          lights: checked === true,
                        });
                      }}
                    />
                    <Label htmlFor="lights" className="font-normal cursor-pointer">
                      Lights
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="screens"
                      checked={form.watch("technical_specs")?.screens || false}
                      onCheckedChange={(checked) => {
                        form.setValue("technical_specs", {
                          ...form.watch("technical_specs"),
                          screens: checked === true,
                        });
                      }}
                    />
                    <Label htmlFor="screens" className="font-normal cursor-pointer">
                      Screens
                    </Label>
                  </div>
                </div>
              </div>

              {/* Availability Dates - Editable Calendar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DateInput
                  value={availabilityStartDate}
                  onChange={handleStartDateChange}
                  min={today}
                  max={maxDate}
                  placeholder="Pick a date"
                  label="Availability Start Date"
                  error={form.formState.errors.availability_start_date?.message}
                />

                <DateInput
                  value={availabilityEndDate}
                  onChange={handleEndDateChange}
                  min={availabilityStartDate || today}
                  max={maxEndDate}
                  placeholder="Pick a date"
                  label="Availability End Date"
                  error={form.formState.errors.availability_end_date?.message}
                  disabled={!availabilityStartDate}
                />
              </div>

              {/* Base Pricing with thousand separator formatting */}
              <div className="space-y-2">
                <Label htmlFor="base_pricing">Base Pricing</Label>
                <PriceInput
                  id="base_pricing"
                  value={form.watch("base_pricing")}
                  onChange={(value) => form.setValue("base_pricing", value, { shouldValidate: false })}
                  placeholder="0.00"
                  aria-invalid={!!form.formState.errors.base_pricing}
                />
                {form.formState.errors.base_pricing && (
                  <p className="text-sm text-destructive">{form.formState.errors.base_pricing.message}</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Contact & Media */}
        {currentStep === 3 && (
          <Card>
            <CardContent className="space-y-4 p-1 sm:p-6">
              {/* Contact Person Name */}
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

              {/* Contact Email and Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact_email">Contact Email</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    {...form.register("contact_email")}
                    placeholder="contact@venue.com"
                    aria-invalid={!!form.formState.errors.contact_email}
                  />
                  {form.formState.errors.contact_email && (
                    <p className="text-sm text-destructive">{form.formState.errors.contact_email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact_phone">Contact Phone</Label>
                  <PhoneInput
                    id="contact_phone"
                    value={form.watch("contact_phone") || undefined}
                    onChange={(value) => form.setValue("contact_phone", value && value.trim() ? value : null)}
                    placeholder="Enter phone number"
                    defaultCountry={phoneDefaultCountry as "US" | "CA" | "GB" | undefined}
                    className="w-full"
                  />
                  {form.formState.errors.contact_phone && (
                    <p className="text-sm text-destructive">{form.formState.errors.contact_phone.message}</p>
                  )}
                </div>
              </div>

              {/* Restrictions with character counter */}
              <div className="space-y-2">
                <Label htmlFor="restrictions">Restrictions</Label>
                <textarea
                  id="restrictions"
                  {...form.register("restrictions")}
                  maxLength={MAX_TEXTAREA_LENGTH}
                  placeholder="Noise restrictions, time limits, catering rules..."
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  aria-invalid={!!form.formState.errors.restrictions}
                />
                <CharacterCounter current={(form.watch("restrictions") || "").length} max={MAX_TEXTAREA_LENGTH} />
                {form.formState.errors.restrictions && (
                  <p className="text-sm text-destructive">{form.formState.errors.restrictions.message}</p>
                )}
              </div>

              {/* Image Upload */}
              <VenueImageUpload
                images={form.watch("images") || []}
                onImagesChange={(images) => form.setValue("images", images)}
                venueId={venueId}
                error={form.formState.errors.images?.message}
                onFilesChange={setUploadedImageFiles}
              />
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
                disabled={createVenueMutation.isPending || updateVenueMutation.isPending || !!duplicateVenue}
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
    </>
  );
}
