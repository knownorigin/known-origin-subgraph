export function createV4EditionId(editionId: string, contractAddress: string): string {
    return contractAddress.concat("-").concat(editionId)
}