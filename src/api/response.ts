
export interface ApiResponse<T> {
    data: T
    success: boolean;
    msg: string;
    code: number;
}