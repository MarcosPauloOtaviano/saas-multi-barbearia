import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CatalogView, parsePrice } from "./catalog-view";
const { model } = vi.hoisted(() => ({ model: { services: [] as unknown[], products: [] as unknown[], addService: vi.fn(), updateService: vi.fn(), toggleService: vi.fn(), saveProduct: vi.fn(), setProductActive: vi.fn() } }));
vi.mock("@/components/app-data-provider",()=>({useAppData:()=>model}));
vi.mock("@/components/app-shell",()=>({PageTitle:({title,action}:{title:string;action:React.ReactNode})=><div><h1>{title}</h1>{action}</div>}));
beforeEach(()=>{vi.clearAllMocks();model.services=[];model.products=[];model.addService.mockResolvedValue({ok:true,message:"Serviço cadastrado."});model.updateService.mockResolvedValue({ok:true,message:"Serviço atualizado."});model.saveProduct.mockResolvedValue({ok:true,message:"Produto salvo."});});
afterEach(cleanup);
describe("Catálogo operacional",()=>{
  it("cadastra um serviço novo em vez de tentar editar um id vazio",async()=>{
    render(<CatalogView kind="service"/>);fireEvent.click(screen.getByRole("button",{name:"Novo serviço"}));
    fireEvent.change(screen.getByLabelText("Nome"),{target:{value:"Corte"}});fireEvent.change(screen.getByLabelText("Preço (R$)"),{target:{value:"35,90"}});
    fireEvent.click(screen.getByRole("button",{name:"Cadastrar serviço"}));
    await waitFor(()=>expect(model.addService).toHaveBeenCalledWith({name:"Corte",description:"",priceCents:3590,durationMinutes:30}));expect(model.updateService).not.toHaveBeenCalled();
  });
  it("edita o serviço existente",async()=>{
    model.services=[{id:"service-id",name:"Corte",description:"",priceCents:3500,durationMinutes:30,active:true}];render(<CatalogView kind="service"/>);
    fireEvent.click(screen.getByRole("button",{name:"Editar Corte"}));fireEvent.change(screen.getByLabelText("Preço (R$)"),{target:{value:"40,00"}});fireEvent.click(screen.getByRole("button",{name:"Salvar alterações"}));
    await waitFor(()=>expect(model.updateService).toHaveBeenCalledWith(expect.objectContaining({id:"service-id",priceCents:4000})));expect(model.addService).not.toHaveBeenCalled();
  });
  it("mostra falha do banco e mantém o formulário para tentar novamente",async()=>{
    model.addService.mockResolvedValue({ok:false,message:"Não foi possível cadastrar."});render(<CatalogView kind="service"/>);fireEvent.click(screen.getByRole("button",{name:"Novo serviço"}));
    fireEvent.change(screen.getByLabelText("Nome"),{target:{value:"Corte"}});fireEvent.change(screen.getByLabelText("Preço (R$)"),{target:{value:"35"}});fireEvent.click(screen.getByRole("button",{name:"Cadastrar serviço"}));
    await waitFor(()=>expect(screen.getByRole("alert").textContent).toContain("Não foi possível"));expect(screen.getByRole("dialog")).toBeTruthy();
  });
  it("cadastra produto sem exigir duração",async()=>{
    render(<CatalogView kind="product"/>);fireEvent.click(screen.getByRole("button",{name:"Novo produto"}));fireEvent.change(screen.getByLabelText("Nome"),{target:{value:"Pomada"}});fireEvent.change(screen.getByLabelText("Preço (R$)"),{target:{value:"25,50"}});fireEvent.click(screen.getByRole("button",{name:"Cadastrar produto"}));
    await waitFor(()=>expect(model.saveProduct).toHaveBeenCalledWith(expect.objectContaining({name:"Pomada",priceCents:2550,id:undefined})));expect(model.addService).not.toHaveBeenCalled();
  });
  it("interpreta preços em reais sem transformar valor inválido em zero",()=>{expect(parsePrice("35,90")).toBe(3590);expect(parsePrice("0")).toBe(0);expect(parsePrice("-1")).toBeNull();expect(parsePrice("1.234,56")).toBeNull();expect(parsePrice("")).toBeNull();});
});
