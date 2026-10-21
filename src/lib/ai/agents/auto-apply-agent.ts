export interface ApplicationFormDetails {
  fullName: string;
  email: string;
  phone: string;
  resumeUrl?: string;
  coverLetterText?: string;
}

export interface AutoApplyResult {
  success: boolean;
  portal: string;
  logs: string[];
  errorMessage?: string;
}

export class AutoApplyAgent {
  static getPortal(jobUrl: string): string {
    let portal = "Generic Board";
    if (jobUrl.includes("lever.co")) portal = "Lever";
    else if (jobUrl.includes("greenhouse.io")) portal = "Greenhouse";
    return portal;
  }

  static simulatePrefill(
    jobUrl: string,
    details: ApplicationFormDetails
  ): string[] {
    const logs: string[] = [];
    const time = () => new Date().toLocaleTimeString("en-US", { hour12: false });
    
    logs.push(`[${time()}] [Headless Browser] Launching isolated Chromium instance...`);
    
    const portal = this.getPortal(jobUrl);

    logs.push(`[${time()}] [Headless Browser] Navigating to job application page: ${jobUrl}`);
    logs.push(`[${time()}] [Form Filler] Found form fields matching schema. Injecting credentials...`);
    logs.push(`[${time()}] [Form Filler] Filled Candidate Full Name: "${details.fullName}"`);
    logs.push(`[${time()}] [Form Filler] Filled Candidate Email Address: "${details.email}"`);
    logs.push(`[${time()}] [Form Filler] Filled Candidate Phone Number: "${details.phone || "Not Provided"}"`);
    
    if (details.resumeUrl || details.fullName) {
      logs.push(`[${time()}] [Form Filler] Uploading tailored resume PDF block...`);
    } else {
      logs.push(`[${time()}] [Form Filler] Attaching generated resume JSON details...`);
    }

    if (details.coverLetterText) {
      logs.push(`[${time()}] [Form Filler] Pasting customized cover letter into description box...`);
    }

    logs.push(`[${time()}] [Automation] Bypassing reCAPTCHA constraints...`);
    return logs;
  }

  static simulateSubmit(jobUrl: string): string[] {
    const logs: string[] = [];
    const time = () => new Date().toLocaleTimeString("en-US", { hour12: false });
    const portal = this.getPortal(jobUrl);

    logs.push(`[${time()}] [Automation] Submitting form application details...`);
    logs.push(`[${time()}] [Portal Response] Received Status Code: 200 (Application received successfully via ${portal})`);
    return logs;
  }

  static async apply(
    jobUrl: string,
    details: ApplicationFormDetails
  ): Promise<AutoApplyResult> {
    const logs: string[] = [];
    logs.push(...this.simulatePrefill(jobUrl, details));
    await new Promise((resolve) => setTimeout(resolve, 800)); // Simulate delay
    logs.push(...this.simulateSubmit(jobUrl));

    return {
      success: true,
      portal: this.getPortal(jobUrl),
      logs
    };
  }
}

