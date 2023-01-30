export function createV4Id(contractAddress: string, editionOrTokenId: string): string {
    return contractAddress.concat("-").concat(editionOrTokenId)
}