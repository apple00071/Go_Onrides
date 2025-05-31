declare module 'opencv.js' {
  interface Mat {
    delete(): void;
    rows: number;
    cols: number;
    data32F: Float32Array;
  }

  interface MatVector {
    size(): number;
    get(index: number): Mat;
    delete(): void;
  }

  interface Size {
    width: number;
    height: number;
  }

  interface Scalar {
    [index: number]: number;
  }

  interface OpenCV {
    imread(canvas: HTMLCanvasElement): Mat;
    imshow(canvas: HTMLCanvasElement, mat: Mat): void;
    Mat: new () => Mat;
    MatVector: new () => MatVector;
    Size: new (width: number, height: number) => Size;
    Scalar: new (r: number, g: number, b: number, a?: number) => Scalar;
    cvtColor(src: Mat, dst: Mat, code: number): void;
    GaussianBlur(src: Mat, dst: Mat, size: Size, sigma: number): void;
    Canny(src: Mat, dst: Mat, threshold1: number, threshold2: number): void;
    findContours(src: Mat, contours: MatVector, hierarchy: Mat, mode: number, method: number): void;
    contourArea(contour: Mat): number;
    arcLength(curve: Mat, closed: boolean): number;
    approxPolyDP(curve: Mat, epsilon: number, closed: boolean): Mat;
    drawContours(image: Mat, contours: MatVector, contourIdx: number, color: Scalar, thickness: number): void;
    getPerspectiveTransform(src: Mat, dst: Mat): Mat;
    warpPerspective(src: Mat, dst: Mat, M: Mat, size: Size): void;

    COLOR_RGBA2GRAY: number;
    RETR_EXTERNAL: number;
    CHAIN_APPROX_SIMPLE: number;
  }

  const cv: OpenCV;
  export default cv;
} 