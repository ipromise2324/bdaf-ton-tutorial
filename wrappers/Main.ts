import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from 'ton-core';
import { Opcodes } from '../helpers/Opcodes';
export type MainConfig = {
    seqno: number;
    publicKey: Buffer;
    ownerAddress: Address;
};

export function mainConfigToCell(config: MainConfig): Cell {
    return beginCell()
        .storeUint(config.seqno,32)
        .storeBuffer(config.publicKey)
        .storeAddress(config.ownerAddress)
    .endCell();
}

export class Main implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new Main(address);
    }

    static createFromConfig(config: MainConfig, code: Cell, workchain = 0) {
        const data = mainConfigToCell(config);
        const init = { code, data };
        return new Main(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }
    async sendDeposit(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.deposit, 32)
            .endCell(),
        });
    }

    async sendWithdraw (provider: ContractProvider, via: Sender, 
        opts:{
            value: bigint,
            amount: bigint
        }) 
    {
        await provider.internal(via, {
            value:opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.withdrawFunds, 32)
                .storeCoins(opts.amount)
            .endCell(),
        });
    }

    async sendChangeOwner (provider: ContractProvider, via: Sender,
        opts:{
            value: bigint,
            newOwner: Address
        })
    {
        await provider.internal(via, {
            value:opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.changeOwner, 32)
                .storeAddress(opts.newOwner)
            .endCell(),
        });
    }

    async sendMessageToOwner (provider: ContractProvider, via: Sender,
        opts:{
            value: bigint,
        })
    {
        await provider.internal(via, {
            value:opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.transferMsgToOwner, 32)
            .endCell(),
        });
    }

    async sendExtMessage (provider: ContractProvider,
        opts:{
            opCode: number,
            seqno: number,
            signFunC: (buf: Buffer) => Buffer,
        })
    {
        const msgToSign = beginCell()
                .storeUint(opts.seqno, 32)
                .storeUint(opts.opCode, 32)
            .endCell();
        const sig = opts.signFunC(msgToSign.hash());

        await provider.external(
            beginCell()
                .storeBuffer(sig)
                .storeSlice(msgToSign.asSlice())
            .endCell()
        );
    }

    async getBalance(provider: ContractProvider): Promise<bigint> {
        const balance = await provider.get('get_smc_balance', []);
        return balance.stack.readBigNumber();
    }

    async getSeqno(provider: ContractProvider): Promise<number> {
        const seqno = await provider.get('get_seqno', []);
        return seqno.stack.readNumber();
    }

    async getOwner(provider: ContractProvider): Promise<Address> {
        const owner = await provider.get('get_owner', []);
        return owner.stack.readAddress();
    }
}


