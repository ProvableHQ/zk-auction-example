import { fieldsToString } from "../encoder.js";
import { filterVisibility } from "../processing.js";

export const parseImages = async (state) => {
    const updatedMetadata = { ...state.metadata };

    for (const auctionId of Object.keys(state.auctions)) {
        const metadata = state.auctions[auctionId]?.metadata;
        if (!metadata) continue;

        const metadataKey = fieldsToString(
            metadata.map(field =>
                BigInt(filterVisibility(field).replace('field', ''))
            )
        );
        if (updatedMetadata[metadataKey]) continue;

        try {
            const response = await fetch(metadataKey);

            updatedMetadata[metadataKey] = await response.json();
        } catch (error) {
            console.log(`Error fetching metadata for auction ${auctionId}: ${error.message}`);
        }
    }

    return {
        ...state,
        metadata: updatedMetadata,
    };
};