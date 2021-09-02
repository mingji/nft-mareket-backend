import { EIP } from '../../config/types/constants';

export default {
    [EIP.EIP_1155]: {
        safeTransferFrom: {
            name: "safeTransferFrom",
            type: "function",
            inputs: [
                {
                    name: "from",
                    type: "address"
                },
                {
                    name: "to",
                    type: "address"
                },
                {
                    name: "id",
                    type: "uint256"
                },
                {
                    name: "amount",
                    type: "uint256"
                },
                {
                    name: "data",
                    type: "bytes"
                }
            ]
        }
    },
    [EIP.EIP_721]: {
        safeTransferFrom: {
            name: "safeTransferFrom",
            type: "function",
            inputs: [
                {
                    name: "from",
                    type: "address"
                },
                {
                    name: "to",
                    type: "address"
                },
                {
                    name: "tokenId",
                    type: "uint256"
                },
                {
                    name: "_data",
                    type: "bytes"
                }
            ]
        }
    }
}