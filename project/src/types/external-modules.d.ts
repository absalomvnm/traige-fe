declare module "react-signature-canvas" {
  import type * as React from "react";

  export interface SignatureCanvasProps {
    penColor?: string;
    canvasProps?: React.CanvasHTMLAttributes<HTMLCanvasElement>;
    onBegin?: () => void;
    onEnd?: () => void;
  }

  export default class SignatureCanvas extends React.Component<SignatureCanvasProps> {
    clear(): void;
    getCanvas(): HTMLCanvasElement;
    getTrimmedCanvas(): HTMLCanvasElement;
  }
}

declare module "react-content-loader" {
  import type * as React from "react";

  export interface ContentLoaderProps extends React.SVGProps<SVGSVGElement> {
    speed?: number;
    width?: string | number;
    height?: string | number;
    backgroundColor?: string;
    foregroundColor?: string;
    uniqueKey?: string;
  }

  const ContentLoader: React.FC<ContentLoaderProps>;
  export default ContentLoader;
}