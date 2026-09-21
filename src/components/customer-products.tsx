"use client";

import Link from "next/link";
import { ArrowRight, Package } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { usePublicShop } from "@/lib/use-public-shop";

export function CustomerProducts({ slug }: { slug: string }) {
  const { products, loading } = usePublicShop(slug);
  const activeProducts = products.filter((product) => product.active);
  return <section className="customer-page">
    <div className="customer-page-title"><p className="eyebrow">Produtos do estabelecimento</p><h1>Cuidados para levar.</h1><p>Itens disponíveis na {slug.split("-").join(" ")}, com preço real e compra combinada diretamente com a equipe.</p></div>
    {loading && <div className="customer-loading">Carregando produtos…</div>}
    {!loading && !activeProducts.length && <div className="customer-access-card"><span><Package /></span><h2>Nenhum produto disponível</h2><p>Este estabelecimento ainda não publicou produtos para compra.</p><Link className="button primary" href={`/b/${slug}/agendar`}>Agendar atendimento <ArrowRight /></Link></div>}
    {!!activeProducts.length && <div className="customer-product-list">{activeProducts.map((product) => <article key={product.id}><span className="customer-product-icon"><Package /></span><div><h2>{product.name}</h2>{product.description && <p>{product.description}</p>}</div><strong>{formatCurrency(product.priceCents)}</strong></article>)}</div>}
  </section>;
}
