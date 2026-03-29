// ============================================================
// src/types/html5-qrcode.d.ts
// Typed augmentation for html5-qrcode — fills gaps in the
// package's own types so no `any` casts are needed.
// ============================================================

declare module "html5-qrcode" {
  export interface Html5QrcodeScannerConfig {
    fps: number;
    qrbox?: number | { width: number; height: number };
    aspectRatio?: number;
    disableFlip?: boolean;
    videoConstraints?: MediaTrackConstraints;
    rememberLastUsedCamera?: boolean;
    supportedScanTypes?: Html5QrcodeScanType[];
    showTorchButtonIfSupported?: boolean;
    showZoomSliderIfSupported?: boolean;
    defaultZoomValueIfSupported?: number;
    useBarCodeDetectorIfSupported?: boolean;
    formatsToSupport?: Html5QrcodeFormats[];
  }

  export type QrcodeSuccessCallback = (decodedText: string, result: Html5QrcodeResult) => void;
  export type QrcodeErrorCallback = (errorMessage: string, error: Html5QrcodeError) => void;

  export interface Html5QrcodeResult {
    decodedText: string;
    result: {
      text: string;
      format?: {
        format: Html5QrcodeFormats;
        formatName: string;
      };
    };
  }

  export interface Html5QrcodeError {
    errorMessage: string;
    type: Html5QrcodeErrorTypes;
  }

  export enum Html5QrcodeErrorTypes {
    UNKWOWN_ERROR = 0,
    SCAN_ERROR_NO_QR_CODE = 1,
  }

  export enum Html5QrcodeScanType {
    SCAN_TYPE_CAMERA = 0,
    SCAN_TYPE_FILE = 1,
  }

  export enum Html5QrcodeFormats {
    QR_CODE = 0,
    AZTEC = 1,
    CODABAR = 2,
    CODE_39 = 3,
    CODE_93 = 4,
    CODE_128 = 5,
    DATA_MATRIX = 6,
    MAXICODE = 7,
    ITF = 8,
    EAN_13 = 9,
    EAN_8 = 10,
    PDF_417 = 11,
    RSS_14 = 12,
    RSS_EXPANDED = 13,
    UPC_A = 14,
    UPC_E = 15,
    UPC_EAN_EXTENSION = 16,
  }

  export class Html5QrcodeScanner {
    constructor(
      elementId: string,
      config: Html5QrcodeScannerConfig,
      verbose?: boolean
    );

    render(
      qrCodeSuccessCallback: QrcodeSuccessCallback,
      qrCodeErrorCallback?: QrcodeErrorCallback
    ): void;

    clear(): Promise<void>;

    getState(): Html5QrcodeScannerState;
  }

  export enum Html5QrcodeScannerState {
    UNKNOWN = 0,
    NOT_STARTED = 1,
    SCANNING = 2,
    PAUSED = 3,
  }

  export class Html5Qrcode {
    constructor(elementId: string);

    start(
      cameraIdOrConfig: string | MediaTrackConstraints,
      configuration: Html5QrcodeScannerConfig,
      qrCodeSuccessCallback: QrcodeSuccessCallback,
      qrCodeErrorCallback?: QrcodeErrorCallback
    ): Promise<null>;

    stop(): Promise<null>;

    clear(): void;

    static getCameras(): Promise<Array<{ id: string; label: string }>>;
  }
}
