import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import type { Prisma } from '@prisma/client'

async function verifyOwnership(projectId: string) {
  const user = await getAuthUser()
  if (!user) return null
  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project || project.userId !== user.id) return null
  return user
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const owner = await verifyOwnership(id)
    if (!owner) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const messages = await prisma.chatMessage.findMany({
      where: { projectId: id },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json(messages)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const owner = await verifyOwnership(id)
    if (!owner) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const body = await request.json()
    const messages: Array<{
      id: string
      role: string
      agent_name?: string
      content: string
      content_type: string
      metadata: Record<string, unknown>
      created_at: string
    }> = body.messages

    if (!Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'messages must be an array' },
        { status: 400 }
      )
    }

    // Delete existing messages and bulk insert (replace strategy)
    await prisma.$transaction([
      prisma.chatMessage.deleteMany({ where: { projectId: id } }),
      prisma.chatMessage.createMany({
        data: messages.map((m) => ({
          id: m.id,
          projectId: id,
          role: m.role,
          agentName: m.agent_name ?? null,
          content: m.content,
          contentType: m.content_type || 'text',
          metadata: (m.metadata || {}) as Prisma.InputJsonValue,
          createdAt: new Date(m.created_at),
        })),
      }),
    ])

    return NextResponse.json({ success: true, count: messages.length })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to save messages' },
      { status: 500 }
    )
  }
}
